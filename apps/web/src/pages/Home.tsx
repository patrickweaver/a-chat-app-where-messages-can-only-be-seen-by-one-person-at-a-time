import { Link } from "react-router";

// Landing page for logged-out visitors. Logged-in users see their inbox at "/" instead.
export function Home() {
  return (
    <main>
      <h1>Chat</h1>
      <p>
        <Link to="/login">Log in</Link> or <Link to="/signup">create an account</Link>.
      </p>
    </main>
  );
}
