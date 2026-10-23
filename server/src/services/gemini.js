// Google Gemini embeddings via the REST API (no SDK needed).
// One free API key from Google AI Studio powers the whole app.
//
// Model: gemini-embedding-001, requested at 768 dimensions — small
// enough to store thousands of vectors in the free Atlas tier, and
// plenty accurate for study notes. Documents are embedded with
// taskType RETRIEVAL_DOCUMENT and questions with RETRIEVAL_QUERY;
// that pairing measurably improves retrieval quality.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const OUTPUT_DIMENSIONS = 768;
const BATCH_SIZE = 50; // requests per batchEmbedContents call

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function callGemini(path, body) {
  const res = await fetch(`${API_BASE}/models/${EMBED_MODEL}:${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 400 && /API key/i.test(detail)) {
      throw new Error("GEMINI_API_KEY is invalid. Check the key in server/.env");
    }
    if (res.status === 429) {
      throw new Error(
        "Gemini free quota reached for now. Please try again in a little while."
      );
    }
    throw new Error(`Gemini API error (${res.status}). Please try again.`);
  }

  return res.json();
}

// Embeds one question for retrieval.
export async function embedQuery(text) {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not set in server/.env");
  }
  const data = await callGemini("embedContent", {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: OUTPUT_DIMENSIONS,
  });
  return data.embedding.values;
}

// Embeds many document chunks, batched. Returns an array of vectors
// in the same order as the input texts.
export async function embedDocuments(texts) {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not set in server/.env");
  }

  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const data = await callGemini("batchEmbedContents", {
      requests: batch.map((text) => ({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: OUTPUT_DIMENSIONS,
      })),
    });
    for (const item of data.embeddings) vectors.push(item.values);
  }
  return vectors;
}
