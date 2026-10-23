import Chunk from "../models/Chunk.js";
import { chunkText } from "../utils/chunkText.js";
import { embedDocuments, isGeminiConfigured } from "./gemini.js";

// Turns a ready document's stored text into embedded chunks:
// split → embed → store. Any previous chunks are replaced, so this is
// safe to re-run. Updates the document's indexed/chunkCount/indexError
// fields either way and returns the document.
export async function indexDocument(doc) {
  if (!isGeminiConfigured()) {
    doc.indexed = false;
    doc.indexError =
      "AI is not configured on the server yet (GEMINI_API_KEY missing).";
    await doc.save();
    return doc;
  }

  try {
    const pieces = chunkText(doc.text || "");
    if (pieces.length === 0) {
      throw new Error("This document has no text to index.");
    }

    const vectors = await embedDocuments(pieces);
    if (vectors.length !== pieces.length) {
      throw new Error("Embedding failed for some chunks. Please try again.");
    }

    await Chunk.deleteMany({ document: doc._id });
    await Chunk.insertMany(
      pieces.map((text, i) => ({
        document: doc._id,
        owner: doc.owner,
        index: i,
        text,
        embedding: vectors[i],
      }))
    );

    doc.chunkCount = pieces.length;
    doc.indexed = true;
    doc.indexError = "";
  } catch (error) {
    doc.indexed = false;
    doc.indexError = error.message;
  }

  await doc.save();
  return doc;
}
