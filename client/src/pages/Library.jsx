import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ doc }) {
  if (doc.status === "ready") {
    return (
      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        Ready
      </span>
    );
  }
  if (doc.status === "failed") {
    return (
      <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-300">
        Failed
      </span>
    );
  }
  return (
    <span className="animate-pulse rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
      Processing
    </span>
  );
}

export default function Library() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const loadDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await api.uploadDocument(formData);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadDocuments();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    const ok = window.confirm(`Delete "${doc.originalName}"?`);
    if (!ok) return;
    try {
      await api.deleteDocument(doc._id);
      setDocuments((docs) => docs.filter((d) => d._id !== doc._id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            My Library
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {documents.length === 0
              ? "Upload your first PDF to get started."
              : `${documents.length} document${documents.length === 1 ? "" : "s"} in your library`}
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div className="mt-8 rounded-2xl border border-dashed border-ink-600 bg-ink-900/60 p-6 transition hover:border-emerald-500/50 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">
            📄
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-white">
            Add a study PDF
          </h2>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Lecture notes, chapters, question papers — text-based PDFs up to
            10 MB. NoteWise reads the text so you can chat with it soon.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              setSelectedFile(e.target.files?.[0] || null);
              setUploadError("");
            }}
          />

          {selectedFile ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <span className="max-w-xs truncate rounded-xl bg-ink-800 px-3 py-2 text-sm text-slate-200">
                {selectedFile.name} · {formatSize(selectedFile.size)}
              </span>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="rounded-xl bg-emerald-500 px-5 py-2 font-semibold text-ink-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {uploading ? "Reading your PDF..." : "Upload & read"}
              </button>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded-xl border border-ink-600 px-4 py-2 text-sm text-slate-300 transition hover:bg-ink-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 rounded-xl bg-emerald-500 px-5 py-2.5 font-semibold text-ink-950 transition hover:bg-emerald-400"
            >
              Choose a PDF
            </button>
          )}

          {uploadError && (
            <div className="mt-4 w-full max-w-md rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="mt-10">
        {loading ? (
          <p className="text-slate-400">Loading your library...</p>
      ) : loadError ? (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {loadError}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-ink-700/60 bg-ink-900 px-6 py-14 text-center">
            <div className="text-4xl">📚</div>
            <h3 className="mt-4 font-display text-lg font-semibold text-white">
              No documents yet
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
              Upload your first PDF above — a chapter you are studying is a
              great place to start.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="rounded-2xl border border-ink-700/60 bg-ink-900 p-5 shadow-card transition hover:border-emerald-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-700 text-lg">
                      📕
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatSize(doc.sizeBytes)}
                        {doc.pageCount ? ` · ${doc.pageCount} pages` : ""}
                        {doc.charCount
                          ? ` · ${doc.charCount.toLocaleString()} characters read`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <StatusBadge doc={doc} />
                </div>

                {doc.status === "failed" && doc.error && (
                  <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {doc.error}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-ink-700/60 pt-3">
                  <span className="text-xs text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="text-xs font-medium text-slate-400 transition hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
