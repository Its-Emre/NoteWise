import { retrieveChunks } from "../services/retrieval.js";
import { generateAnswer } from "../services/gemini.js";

// If even the best-matching chunk scores below this, the notes almost
// certainly don't cover the question — answer honestly without
// spending a Gemini call. (Tunable: cosine scores for genuinely
// relevant Gemini embeddings typically land well above 0.5.)
const MIN_RELEVANCE_SCORE = 0.25;

const NOT_FOUND_ANSWER =
  "I couldn't find that in your notes. Try asking about a topic your uploaded documents actually cover — or upload the document that has it.";

// POST /api/chat — protected.
// Body: { question, documentIds? }
// Full RAG: retrieve the best chunks from the user's own notes, then
// ask Gemini to answer strictly from those chunks. Returns the answer
// plus the sources it was grounded on.
export const chat = async (req, res) => {
  try {
    const { question, documentIds } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ message: "A question is required" });
    }

    const cleanQuestion = question.trim();
    const { totalChunks, results } = await retrieveChunks(req.user._id, cleanQuestion, {
      documentIds,
      topK: 5,
    });

    if (totalChunks === 0) {
      return res.status(400).json({
        message:
          "No indexed documents yet. Upload a PDF and enable AI on it first.",
      });
    }

    const sources = results.map(({ documentId, documentName, chunkIndex, score }) => ({
      documentId,
      documentName,
      chunkIndex,
      score,
    }));

    if (results.length === 0 || results[0].score < MIN_RELEVANCE_SCORE) {
      return res.json({ answer: NOT_FOUND_ANSWER, sources: [] });
    }

    const answer = await generateAnswer(cleanQuestion, results);
    res.json({ answer, sources });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
