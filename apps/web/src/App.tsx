import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth";
import { Home } from "./pages/Home";
import { Inbox } from "./pages/Inbox";
import { Login } from "./pages/Login";
import { MessagePage } from "./pages/Message";
import { Send } from "./pages/Send";
import { Signup } from "./pages/Signup";

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;

  return (
    <Routes>
      <Route path="/" element={user ? <Inbox /> : <Home />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
      <Route path="/send" element={user ? <Send /> : <Navigate to="/login" replace />} />
      <Route
        path="/messages/:id"
        element={user ? <MessagePage /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
