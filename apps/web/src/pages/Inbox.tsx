import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api, type MessageSummary } from "../api";
import { useAuth } from "../auth";
import { formatDate } from "../format";

export function Inbox() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Set by pages that navigate here after an action, e.g. "Forwarded to bob." Kept in
  // component state and cleared from history so it doesn't reappear on reload.
  const [notice] = useState((location.state as { notice?: string } | null)?.notice);
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);
  const [messages, setMessages] = useState<MessageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMessages()
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."));
  }, []);

  async function logout() {
    await api.logout();
    setUser(null);
  }

  return (
    <main>
      <p>
        Logged in as {user?.username}.{" "}
        <button type="button" onClick={logout}>
          Log out
        </button>
      </p>
      <h1>Inbox</h1>
      {notice && <p role="status">{notice}</p>}
      <p>
        <Link to="/send">Send a message</Link>
      </p>
      {error && <p role="alert">{error}</p>}
      {messages === null && !error && <p>Loading…</p>}
      {messages?.length === 0 && <p>No messages yet.</p>}
      {messages && messages.length > 0 && (
        <ul>
          {messages.map((m) => (
            <li key={m.id}>
              <Link to={`/messages/${m.id}`}>
                A message from {m.fromUsername}, {formatDate(m.receivedAt)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
