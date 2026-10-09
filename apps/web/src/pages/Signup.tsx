import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api";
import { useAuth } from "../auth";

export function Signup() {
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
      const user = await api.signup({
        username: String(form.get("username")),
        email: String(form.get("email")),
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
      <h1>Create account</h1>
      <form onSubmit={onSubmit}>
        <p>
          <label>
            Username
            <br />
            <input
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]+"
              title="Letters, numbers, and underscores only"
            />
          </label>
        </p>
        <p>
          <label>
            Email
            <br />
            <input name="email" type="email" autoComplete="email" required />
          </label>
        </p>
        <p>
          <label>
            Password
            <br />
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          Create account
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>.
      </p>
    </main>
  );
}
