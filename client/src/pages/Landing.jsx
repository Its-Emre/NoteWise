import { Link } from "react-router-dom";
import { Logo } from "../components/Logo";

const FEATURES = [
  {
    icon: "📄",
    title: "Upload your PDFs",
    text: "Lecture notes, textbook chapters, previous-year papers — drop them in and NoteWise reads every page.",
  },
  {
    icon: "💬",
    title: "Ask anything",
    text: "Questions are answered from your own material, in plain language — like a tutor who has read exactly what you have.",
  },
  {
    icon: "🔖",
    title: "Answers with sources",
    text: "Every answer shows where it came from in your notes. If it is not in your notes, NoteWise says so — no made-up answers.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-ink-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-ink-950 transition hover:bg-emerald-400"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl px-6">
        <section className="animate-fade-up pb-20 pt-14 text-center">
          <p className="mx-auto w-fit rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-300">
            AI study assistant · RAG powered
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Your notes,
            <span className="bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent">
              {" "}
              answering back.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">
            Upload your study PDFs and chat with them. NoteWise finds the
            right pages and answers from your material — with sources, not
            guesses.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-ink-950 shadow-glow transition hover:bg-emerald-400"
            >
              Start learning — it's free
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-ink-600 px-6 py-3 font-medium text-slate-200 transition hover:border-ink-600 hover:bg-ink-800"
            >
              I have an account
            </Link>
          </div>
        </section>

        <section className="grid gap-5 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-ink-700/60 bg-ink-900 p-6 shadow-card transition hover:border-emerald-500/40"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {f.text}
              </p>
            </div>
          ))}
        </section>

        <footer className="border-t border-ink-700/60 py-8 text-center text-sm text-slate-500">
          NoteWise — built with React, Node.js, MongoDB and Google Gemini.
        </footer>
      </main>
    </div>
  );
}
