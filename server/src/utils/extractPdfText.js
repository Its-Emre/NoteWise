import { extractText } from "unpdf";

// Extracts plain text (and the page count) from a PDF buffer using
// unpdf (a maintained pdf.js wrapper that works on modern Node).
// Scanned/image-only PDFs legitimately return empty text — the caller
// treats that as a "failed" document with an explanation for the user.
export async function extractPdfText(buffer) {
  const { totalPages, text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  return {
    text: (text || "").trim(),
    pages: totalPages || 0,
  };
}
