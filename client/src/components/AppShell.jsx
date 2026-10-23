import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import { Logo } from "./Logo";

// Layout for signed-in pages: classy sidebar on desktop, a slim top
// bar on mobile.
export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />

      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-ink-700/60 bg-ink-900 px-4 py-3 md:hidden">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Hi, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs font-medium text-slate-300"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
