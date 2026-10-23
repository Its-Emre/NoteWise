import mongoose from "mongoose";

// A study document (PDF) uploaded by a user. In Sprint 1 the extracted
// text is stored on the document itself; Sprint 2 splits it into chunks
// with embeddings (see the Chunk model planned in the blueprint).
const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    originalName: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    pageCount: { type: Number, default: 0 },
    charCount: { type: Number, default: 0 },
    // Full extracted text. Excluded from list responses (can be large).
    text: { type: String, default: "" },
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
    },
    // Why extraction failed, when status is "failed".
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);

export default Document;
