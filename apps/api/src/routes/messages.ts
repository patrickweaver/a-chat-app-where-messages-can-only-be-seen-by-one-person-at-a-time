import { Router, type Request, type Response } from "express";
import { requireUser } from "../auth/sessions.js";
import { pool } from "../db.js";

export const messagesRouter = Router();
messagesRouter.use(requireUser);

const MAX_BODY_LENGTH = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMOJI_RE = /^\p{RGI_Emoji}$/v;

// Malformed ids would make Postgres throw on the uuid cast; map them to null so they're "not found".
const messageId = (id: string) => (UUID_RE.test(id) ? id : null);

function parseEmoji(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const emoji = value.trim();
  if (EMOJI_RE.test(emoji)) return emoji;
  // Some pickers insert the text-style form (e.g. "❤" without the emoji variation selector).
  if (EMOJI_RE.test(emoji + "️")) return emoji + "️";
  return null;
}

// Looks up the recipient named in req.body.to. Sends an error response and returns null if
// there's no such user or it's the current user.
async function findRecipient(req: Request, res: Response): Promise<{ id: string } | null> {
  const to = typeof req.body?.to === "string" ? req.body.to.trim().replace(/^@/, "") : "";
  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM users WHERE lower(username) = lower($1)",
    [to],
  );
  const recipient = rows[0];
  if (!recipient) {
    res.status(404).json({ error: "No user with that username." });
    return null;
  }
  if (recipient.id === req.user!.id) {
    res.status(400).json({ error: "You can't send a message to yourself." });
    return null;
  }
  return recipient;
}

// Send a message. The response deliberately doesn't echo the message back:
// once sent, it's only visible to the recipient.
messagesRouter.post("/", async (req, res) => {
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!body) {
    res.status(400).json({ error: "Message can't be empty." });
    return;
  }
  if (body.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: `Message must be at most ${MAX_BODY_LENGTH} characters.` });
    return;
  }

  const recipient = await findRecipient(req, res);
  if (!recipient) return;

  await pool.query(
    `INSERT INTO messages (author_id, sender_id, recipient_id, body) VALUES ($1, $1, $2, $3)`,
    [req.user!.id, recipient.id, body],
  );
  res.status(204).end();
});

// List messages held by the current user (without bodies).
messagesRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, u.username AS "fromUsername", m.delivered_at AS "receivedAt"
       FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.recipient_id = $1
      ORDER BY m.delivered_at DESC`,
    [req.user!.id],
  );
  res.json({ messages: rows });
});

// Read a single message. Only its current recipient can see it. "fromUsername" is whoever
// sent or last forwarded it; the original author is never revealed.
messagesRouter.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT m.id, u.username AS "fromUsername", m.body, m.delivered_at AS "receivedAt",
            coalesce(
              (SELECT array_agg(r.emoji ORDER BY r.id) FROM message_reactions r
                WHERE r.message_id = m.id),
              '{}'
            ) AS reactions
       FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.id = $1 AND m.recipient_id = $2`,
    [messageId(req.params.id), req.user!.id],
  );
  const row = rows[0];
  if (!row) {
    res.status(404).json({ error: "Message not found." });
    return;
  }
  const { reactions, ...message } = row as { reactions: string[] };
  res.json({
    message: {
      ...message,
      // The forwarder's reaction is shown above the message, earlier forwards' below it.
      latestReaction: reactions.at(-1) ?? null,
      earlierReactions: reactions.slice(0, -1),
    },
  });
});

// Forward a message with a reaction emoji. The message moves to the new recipient and
// leaves the forwarder's inbox.
messagesRouter.post("/:id/forward", async (req, res) => {
  const emoji = parseEmoji(req.body?.reaction);
  if (!emoji) {
    res.status(400).json({ error: "Pick a single emoji as your reaction." });
    return;
  }

  const recipient = await findRecipient(req, res);
  if (!recipient) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Checking and moving in one statement means concurrent forwards can't both succeed.
    const { rowCount } = await client.query(
      `UPDATE messages SET sender_id = $2, recipient_id = $3, delivered_at = now()
        WHERE id = $1 AND recipient_id = $2`,
      [messageId(req.params.id), req.user!.id, recipient.id],
    );
    if (rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Message not found." });
      return;
    }
    await client.query(
      "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)",
      [req.params.id, req.user!.id, emoji],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  res.status(204).end();
});
