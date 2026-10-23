import { Link } from "react-router-dom";

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 font-display text-lg font-extrabold text-ink-950 shadow-glow">
        N
      </span>
      {!compact && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          Note<span className="text-emerald-400">Wise</span>
        </span>
      )}
    </Link>
  );
}
