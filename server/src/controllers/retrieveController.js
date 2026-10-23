import Chunk from "../models/Chunk.js";
import Document from "../models/Document.js";
import { embedQuery } from "../services/gemini.js";
import { rankChunks } from "../utils/similarity.js";

// POST /api/retrieve — protected.
// Body: { question, documentIds?, topK? }
// Embeds the question, scores all of the user's chunks with cosine
// similarity and returns the best matches. This is the retrieval half
// of RAG; Sprint 3's chat feeds these chunks to Gemini to answer.
export const retrieve = async (req, res) => {
  try {
    const { question, documentIds, topK } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ message: "A question is required" });
    }

    const query = { owner: req.user._id };
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      query.document = { $in: documentIds };
    }

    const chunks = await Chunk.find(query).select("document index text embedding");
    if (chunks.length === 0) {
      return res.status(400).json({
        message:
          "No indexed documents yet. Upload a PDF and enable AI on it first.",
      });
    }

    const queryVector = await embedQuery(question.trim());
    const k = Math.min(Math.max(parseInt(topK, 10) || 5, 1), 20);
    const top = rankChunks(chunks, queryVector, k);

    const docIds = [...new Set(top.map(({ chunk }) => chunk.document.toString()))];
    const docs = await Document.find({ _id: { $in: docIds } }).select("originalName");
    const nameById = new Map(docs.map((d) => [d._id.toString(), d.originalName]));

    res.json({
      question: question.trim(),
      results: top.map(({ chunk, score }) => ({
        documentId: chunk.document,
        documentName: nameById.get(chunk.document.toString()) || "Document",
        chunkIndex: chunk.index,
        score: Number(score.toFixed(4)),
        text: chunk.text,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
