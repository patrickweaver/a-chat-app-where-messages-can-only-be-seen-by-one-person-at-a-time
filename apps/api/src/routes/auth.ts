import { Router } from "express";
import { DatabaseError } from "pg";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { createSession, destroySession, type User } from "../auth/sessions.js";
import { pool } from "../db.js";

export const authRouter = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;

// Used to keep login timing similar whether or not the username exists.
const dummyHash = hashPassword("not-a-real-password");

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

authRouter.post("/signup", async (req, res) => {
  const username = str(req.body?.username).trim();
  const email = str(req.body?.email).trim().toLowerCase();
  const password = str(req.body?.password);

  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: "Username must be 3-30 letters, numbers, or underscores." });
    return;
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({
      error: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`,
    });
    return;
  }

  let user: User;
  try {
    const { rows } = await pool.query<User>(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, await hashPassword(password)],
    );
    user = rows[0]!;
  } catch (err) {
    if (err instanceof DatabaseError && err.code === "23505") {
      const field = err.constraint?.includes("email") ? "email" : "username";
      res.status(409).json({ error: `That ${field} is already taken.` });
      return;
    }
    throw err;
  }

  await createSession(res, user.id);
  res.status(201).json({ user });
});

authRouter.post("/login", async (req, res) => {
  const username = str(req.body?.username).trim().replace(/^@/, "");
  const password = str(req.body?.password).slice(0, MAX_PASSWORD_LENGTH);

  const { rows } = await pool.query<User & { password_hash: string }>(
    "SELECT id, username, email, password_hash FROM users WHERE lower(username) = lower($1)",
    [username],
  );
  const row = rows[0];
  const ok = await verifyPassword(password, row?.password_hash ?? (await dummyHash));
  if (!row || !ok) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }

  await createSession(res, row.id);
  res.json({ user: { id: row.id, username: row.username, email: row.email } });
});

authRouter.post("/logout", async (req, res) => {
  await destroySession(req, res);
  res.status(204).end();
});

authRouter.get("/me", (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }
  res.json({ user: req.user });
});
