import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function SourceChips({ sources }) {
  if (!sources || sources.length === 0) return null;
  const names = [...new Set(sources.map((s) => s.documentName))];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
        >
          📕 {name}
        </span>
      ))}
    </div>
  );
}

export default function Chat() {
  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    api
      .getDocuments()
      .then((docs) => {
        const indexed = docs.filter((d) => d.status === "ready" && d.indexed);
        setDocuments(indexed);
        setSelectedIds(indexed.map((d) => d._id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingDocs(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const toggleDoc = (id) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );

  const handleSend = async (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;
    if (selectedIds.length === 0) {
      setError("Select at least one document to ask from.");
      return;
    }

    setError("");
    setInput("");
    setMessages((msgs) => [...msgs, { role: "user", text: question }]);
    setSending(true);
    try {
      const data = await api.chat({ question, documentIds: selectedIds });
      setMessages((msgs) => [
        ...msgs,
        { role: "assistant", text: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-3xl font-bold text-white">
        Chat with your notes
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Answers come from your own documents — with the sources shown.
      </p>

      {loadingDocs ? (
        <p className="mt-8 text-slate-400">Loading your documents...</p>
      ) : documents.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-ink-700/60 bg-ink-900 px-6 py-14 text-center">
          <div className="text-4xl">💬</div>
          <h3 className="mt-4 font-display text-lg font-semibold text-white">
            No AI-ready documents yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
            Upload a PDF in your Library and press "Enable AI search" on
            it — then come back here and ask your first question.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-emerald-400"
          >
            Go to My Library
          </Link>
        </div>
      ) : (
        <>
          {/* Document selector */}
          <div className="mt-6 flex flex-wrap gap-2">
            {documents.map((doc) => {
              const active = selectedIds.includes(doc._id);
              return (
                <button
                  key={doc._id}
                  onClick={() => toggleDoc(doc._id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                      : "border-ink-600 bg-ink-900 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {active ? "✓ " : ""}📕 {doc.originalName}
                </button>
              );
            })}
          </div>

          {/* Messages */}
          <div className="mt-6 min-h-[300px] rounded-2xl border border-ink-700/60 bg-ink-900/60 p-4 sm:p-6">
            {messages.length === 0 && !sending ? (
              <div className="flex h-[300px] flex-col items-center justify-center text-center">
                <div className="text-4xl">🧠</div>
                <p className="mt-4 max-w-sm text-sm text-slate-400">
                  Ask anything from the selected documents — for example,
                  "Explain the main topic of this chapter in simple words."
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-emerald-500 px-4 py-3 text-[15px] font-medium leading-relaxed text-emerald-950">
                        {msg.text}
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 font-display text-sm font-extrabold text-ink-950">
                        N
                      </span>
                      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-ink-700/70 bg-ink-800 px-4 py-3">
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-200">
                          {msg.text}
                        </p>
                        <SourceChips sources={msg.sources} />
                      </div>
                    </div>
                  )
                )}

                {sending && (
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 font-display text-sm font-extrabold text-ink-950">
                      N
                    </span>
                    <div className="rounded-2xl rounded-tl-md border border-ink-700/70 bg-ink-800 px-4 py-3">
                      <p className="animate-pulse text-sm text-slate-400">
                        NoteWise is reading your notes...
                      </p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSend} className="mt-4 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Apne notes se kuch bhi puchho..."
              className="flex-1 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="rounded-xl bg-emerald-500 px-5 font-semibold text-ink-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {sending ? "..." : "Ask →"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
