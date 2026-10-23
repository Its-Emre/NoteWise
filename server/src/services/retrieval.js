import Chunk from "../models/Chunk.js";
import Document from "../models/Document.js";
import { embedQuery } from "./gemini.js";
import { rankChunks } from "../utils/similarity.js";

// Shared retrieval: embeds the question, scores the user's chunks
// with cosine similarity and returns the top matches, each enriched
// with its document's name. Used by both /api/retrieve (Sprint 2)
// and /api/chat (Sprint 3).
export async function retrieveChunks(userId, question, { documentIds, topK = 5 } = {}) {
  const query = { owner: userId };
  if (Array.isArray(documentIds) && documentIds.length > 0) {
    query.document = { $in: documentIds };
  }

  const chunks = await Chunk.find(query).select("document index text embedding");
  if (chunks.length === 0) return { totalChunks: 0, results: [] };

  const queryVector = await embedQuery(question);
  const k = Math.min(Math.max(parseInt(topK, 10) || 5, 1), 20);
  const top = rankChunks(chunks, queryVector, k);

  const docIds = [...new Set(top.map(({ chunk }) => chunk.document.toString()))];
  const docs = await Document.find({ _id: { $in: docIds } }).select("originalName");
  const nameById = new Map(docs.map((d) => [d._id.toString(), d.originalName]));

  return {
    totalChunks: chunks.length,
    results: top.map(({ chunk, score }) => ({
      documentId: chunk.document,
      documentName: nameById.get(chunk.document.toString()) || "Document",
      chunkIndex: chunk.index,
      score: Number(score.toFixed(4)),
      text: chunk.text,
    })),
  };
}
