import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, type Message } from "../api";
import { formatDate } from "../format";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
// Beyond this many earlier reactions, the list overlaps to stay compact.
const MAX_UNOVERLAPPED_REACTIONS = 5;

export function MessagePage() {
  const { id } = useParams();
  const [message, setMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getMessage(id)
      .then(setMessage)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."));
  }, [id]);

  return (
    <main>
      <p>
        <Link to="/">Inbox</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {!message && !error && <p>Loading…</p>}
      {message && (
        <>
          <article>
            <div className="note-card">
              {/* Who sent or last forwarded it, with their reaction if it was forwarded. */}
              <p className="note-reaction">
                <span>
                  {message.fromUsername}
                  {message.latestReaction && `: "${message.latestReaction}"`}
                </span>
              </p>
              <div className="note">
                <p className="note-body">{message.body}</p>
                <p className="note-time">
                  <time dateTime={message.receivedAt}>{formatDate(message.receivedAt)}</time>
                </p>
              </div>
              {message.earlierReactions.length > 0 && (
                <div className="note-reactions-tab">
                  <ul
                    className="reactions"
                    data-overlap={message.earlierReactions.length > MAX_UNOVERLAPPED_REACTIONS}
                    aria-label="Earlier reactions"
                  >
                    {message.earlierReactions.map((emoji, i) => (
                      <li key={i}>{emoji}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
          <PassNote messageId={message.id} />
          <p>
            <Link to={`/send?to=${encodeURIComponent(message.fromUsername)}`}>
              Send {message.fromUsername} a new message
            </Link>
          </p>
        </>
      )}
    </main>
  );
}

// "Pass note" button that opens a modal for forwarding the message with a reaction.
function PassNote({ messageId }: { messageId: string }) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reaction, setReaction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const to = String(new FormData(e.currentTarget).get("to")).replace(/^@/, "");
    setError(null);
    setSubmitting(true);
    try {
      await api.forwardMessage(messageId, { to, reaction });
      dialogRef.current?.close();
      // The message is no longer ours, so there's nothing left to show here.
      navigate("/", { replace: true, state: { notice: `Note passed to ${to}.` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <p>
        <button type="button" onClick={() => dialogRef.current?.showModal()}>
          Pass note
        </button>
      </p>
      <dialog ref={dialogRef} aria-labelledby="pass-note-title" onClose={() => setError(null)}>
        <h2 id="pass-note-title">Pass note</h2>
        <p>Passing this note moves it out of your inbox. They'll see it as from you.</p>
        <form onSubmit={onSubmit}>
          <p>
            <label>
              To (username)
              <br />
              <input name="to" required autoComplete="off" />
            </label>
          </p>
          <fieldset>
            <legend>Your reaction</legend>
            <p>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-pressed={reaction === emoji}
                  onClick={() => setReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </p>
            <label>
              Or any emoji{" "}
              <input
                name="reaction"
                required
                size={4}
                autoComplete="off"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
              />
            </label>
          </fieldset>
          {error && <p role="alert">{error}</p>}
          <p>
            <button type="submit" disabled={submitting}>
              Pass note
            </button>{" "}
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
          </p>
        </form>
      </dialog>
    </>
  );
}
