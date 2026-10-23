import Document from "../models/Document.js";
import Chunk from "../models/Chunk.js";
import { extractPdfText } from "../utils/extractPdfText.js";
import { indexDocument } from "../services/indexer.js";

// POST /api/documents — protected. Multipart form, field name "file".
// Extracts the PDF's text and stores it on the document. The response
// never includes the (potentially large) extracted text itself.
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please choose a PDF file" });
    }

    const doc = await Document.create({
      owner: req.user._id,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      status: "processing",
    });

    try {
      const { text, pages } = await extractPdfText(req.file.buffer);
      doc.pageCount = pages;

      if (!text) {
        doc.status = "failed";
        doc.error =
          "No readable text found in this PDF. It may be scanned images — NoteWise needs a text-based PDF.";
      } else {
        doc.status = "ready";
        doc.text = text;
        doc.charCount = text.length;
      }
    } catch (parseError) {
      doc.status = "failed";
      doc.error = "Could not read this PDF file. It may be corrupted.";
    }

    await doc.save();

    // Sprint 2: if the text was read, try to index it for AI search
    // right away (chunk + embed). Failure never fails the upload —
    // the document simply stays "not indexed" with a reason, and the
    // user can retry from the Library.
    if (doc.status === "ready") {
      await indexDocument(doc);
    }

    const { text, ...summary } = doc.toObject();
    res.status(201).json(summary);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/documents/:id/index — protected, owner only.
// (Re)builds the document's chunks + embeddings so it can be searched
// and chatted with.
export const indexMyDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only index your own documents" });
    }
    if (doc.status !== "ready") {
      return res
        .status(400)
        .json({ message: "Only successfully read documents can be indexed" });
    }

    await indexDocument(doc);

    const { text, ...summary } = doc.toObject();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/documents — protected. My documents, newest first, no text.
export const getMyDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user._id })
      .select("-text")
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/documents/:id — protected, owner only. Includes a short text
// preview instead of the full text.
export const getDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only view your own documents" });
    }

    const { text, ...summary } = doc.toObject();
    res.json({ ...summary, textPreview: text ? text.slice(0, 400) : "" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// DELETE /api/documents/:id — protected, owner only.
export const deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    if (doc.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own documents" });
    }

    await Chunk.deleteMany({ document: doc._id });
    await doc.deleteOne();
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
