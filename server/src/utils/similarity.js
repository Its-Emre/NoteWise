// Cosine similarity between two embedding vectors: 1 means "same
// meaning direction", 0 means unrelated. This is the entire retrieval
// trick — a question and a chunk with similar meaning have vectors
// pointing in a similar direction.
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Scores every chunk against the query vector and returns the top k,
// highest score first.
export function rankChunks(chunks, queryVector, k = 5) {
  return chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
}
