import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";

function NavItem({ to, icon, children, soon = false }) {
  if (soon) {
    return (
      <span className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500">
        <span className="text-base">{icon}</span>
        {children}
        <span className="ml-auto rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Soon
        </span>
      </span>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-ink-700 text-white"
            : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
        }`
      }
    >
      <span className="text-base">{icon}</span>
      {children}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink-700/60 bg-ink-900 px-4 py-6 md:flex">
      <div className="px-2">
        <Logo />
      </div>

      <nav className="mt-10 flex flex-col gap-1.5">
        <NavItem to="/" icon="📚">
          My Library
        </NavItem>
        <NavItem to="/chat" icon="💬">
          Chat
        </NavItem>
      </nav>

      <div className="mt-auto border-t border-ink-700/60 pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-600 font-display text-sm font-bold text-emerald-300">
            {user?.name?.charAt(0)?.toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user?.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 w-full rounded-xl border border-ink-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
