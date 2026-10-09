import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { useAuth } from "../auth";

export function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setSubmitting(true);
    try {
      const user = await api.login({
        username: String(form.get("username")),
        password: String(form.get("password")),
      });
      setUser(user);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Log in</h1>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            Username
            <br />
            <input name="username" autoComplete="username" required />
          </label>
        </p>
        <p>
          <label>
            Password
            <br />
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          Log in
        </button>
      </form>
      <p>
        No account? <Link to="/signup">Create one</Link>.
      </p>
    </main>
  );
}
