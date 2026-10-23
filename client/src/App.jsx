import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Library from "./pages/Library";
import Chat from "./pages/Chat";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <p className="animate-pulse font-display text-lg text-slate-400">
          NoteWise is warming up...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <AppShell>
              <Library />
            </AppShell>
          ) : (
            <Landing />
          )
        }
      />
      <Route
        path="/chat"
        element={
          user ? (
            <AppShell>
              <Chat />
            </AppShell>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <Register />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
