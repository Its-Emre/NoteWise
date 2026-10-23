import { retrieveChunks } from "../services/retrieval.js";

// POST /api/retrieve — protected.
// Body: { question, documentIds?, topK? }
// Returns the chunks most relevant to the question. This is the
// retrieval half of RAG, exposed for testing; /api/chat builds the
// full answer on top of the same service.
export const retrieve = async (req, res) => {
  try {
    const { question, documentIds, topK } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      return res.status(400).json({ message: "A question is required" });
    }

    const { totalChunks, results } = await retrieveChunks(req.user._id, question.trim(), {
      documentIds,
      topK,
    });

    if (totalChunks === 0) {
      return res.status(400).json({
        message:
          "No indexed documents yet. Upload a PDF and enable AI on it first.",
      });
    }

    res.json({ question: question.trim(), results });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};
