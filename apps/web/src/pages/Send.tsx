import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../api";

export function Send() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const to = String(form.get("to"));
    setError(null);
    setSentTo(null);
    setSubmitting(true);
    try {
      await api.sendMessage({ to, body: String(form.get("body")) });
      // Once sent, the message is the recipient's alone, so clear it from the form.
      formEl.reset();
      setSentTo(to.replace(/^@/, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <p>
        <Link to="/">Inbox</Link>
      </p>
      <h1>Send a message</h1>
      <p>Once you send a message, only the recipient can see it. Not even you can see it again.</p>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            To (username)
            <br />
            <input
              name="to"
              required
              autoComplete="off"
              defaultValue={searchParams.get("to") ?? ""}
            />
          </label>
        </p>
        <p>
          <label>
            Message
            <br />
            <textarea name="body" required rows={8} maxLength={5000} />
          </label>
        </p>
        {error && <p role="alert">{error}</p>}
        {sentTo && <p role="status">Message sent to {sentTo}.</p>}
        <button type="submit" disabled={submitting}>
          Send
        </button>
      </form>
    </main>
  );
}
