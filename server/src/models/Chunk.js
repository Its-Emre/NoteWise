import mongoose from "mongoose";

// One small piece of a document's text, together with its embedding
// vector. Retrieval (Sprint 2) compares a question's vector against
// these with cosine similarity; chat (Sprint 3) answers from the best
// matching chunks.
const chunkSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    index: { type: Number, required: true },
    text: { type: String, required: true },
    // Gemini embedding, 768 dimensions (see services/gemini.js).
    embedding: { type: [Number], required: true },
  },
  { timestamps: true }
);

const Chunk = mongoose.model("Chunk", chunkSchema);

export default Chunk;
