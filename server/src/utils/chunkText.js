// Splits long text into overlapping chunks for embedding.
//
// Why overlap? If a chunk boundary cuts an idea in half, neither half
// may match a question well. Overlapping by ~150 characters means
// every idea survives whole in at least one chunk. Boundaries prefer
// the last space/newline near the limit so words are not split.
export function chunkText(text, { size = 900, overlap = 150 } = {}) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    if (end < clean.length) {
      const windowStart = Math.max(start + size - 200, start);
      const breakAt = Math.max(
        clean.lastIndexOf(" ", end),
        clean.lastIndexOf(". ", end)
      );
      if (breakAt > windowStart) end = breakAt + 1;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= clean.length) break;

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
