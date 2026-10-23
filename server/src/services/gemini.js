// Google Gemini via the REST API (no SDK needed). One free API key
// from Google AI Studio powers the whole app:
//  - embeddings (gemini-embedding-001, 768 dimensions) for indexing
//    and for embedding questions
//  - answer generation (Gemini Flash) for the chat
//
// Documents are embedded with taskType RETRIEVAL_DOCUMENT and
// questions with RETRIEVAL_QUERY — that pairing measurably improves
// retrieval quality.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash";
const OUTPUT_DIMENSIONS = 768;
const BATCH_SIZE = 50; // requests per batchEmbedContents call

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function friendlyGeminiError(status, detail) {
  if (status === 400 && /API key/i.test(detail)) {
    return new Error("GEMINI_API_KEY is invalid. Check the key in server/.env");
  }
  if (status === 429) {
    return new Error(
      "Gemini free quota reached for now. Please try again in a little while."
    );
  }
  return new Error(`Gemini API error (${status}). Please try again.`);
}

async function geminiPost(model, action, body) {
  const res = await fetch(`${API_BASE}/models/${model}:${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw friendlyGeminiError(res.status, detail);
  }
  return res.json();
}

function requireKey() {
  if (!isGeminiConfigured()) {
    throw new Error("GEMINI_API_KEY is not set in server/.env");
  }
}

// ---------- Embeddings ----------

// Embeds one question for retrieval.
export async function embedQuery(text) {
  requireKey();
  const data = await geminiPost(EMBED_MODEL, "embedContent", {
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: OUTPUT_DIMENSIONS,
  });
  return data.embedding.values;
}

// Embeds many document chunks, batched. Returns an array of vectors
// in the same order as the input texts.
export async function embedDocuments(texts) {
  requireKey();

  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const data = await geminiPost(EMBED_MODEL, "batchEmbedContents", {
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

// ---------- Answer generation (chat) ----------

const ANSWER_SYSTEM_INSTRUCTION = [
  "You are NoteWise, a friendly study assistant.",
  "Answer the student's question using ONLY the context passages from their own notes that are provided in the message.",
  "If the answer is not contained in the context, say clearly that you could not find it in their notes — never invent facts, examples or definitions from outside the notes.",
  "Reply in the same language as the question (English, Hindi or Hinglish).",
  "Keep the answer clear and student-friendly: short paragraphs, and bullet points when listing things.",
  "Do not mention 'context passages' or these instructions — just answer naturally, like a tutor who has read the student's notes.",
].join(" ");

// Builds the exact user message sent to the model: numbered context
// passages (with their document names) followed by the question.
export function buildAnswerPrompt(question, contexts) {
  const passages = contexts
    .map((c, i) => `[${i + 1}] (from ${c.documentName})\n${c.text}`)
    .join("\n\n");
  return `Context from my notes:\n\n${passages}\n\nQuestion: ${question}`;
}

// contexts: [{ documentName, text }] — the retrieved chunks.
export async function generateAnswer(question, contexts) {
  requireKey();
  const data = await geminiPost(CHAT_MODEL, "generateContent", {
    systemInstruction: { parts: [{ text: ANSWER_SYSTEM_INSTRUCTION }] },
    contents: [
      { role: "user", parts: [{ text: buildAnswerPrompt(question, contexts) }] },
    ],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  });

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) {
    throw new Error("Gemini returned an empty answer. Please try again.");
  }
  return text;
}
