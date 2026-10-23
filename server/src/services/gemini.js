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
// Chat models are tried in order until one answers — Google retires
// and renames models over time, and a fresh API key may not have
// access to every name. A 404 ("model not found") simply moves on to
// the next candidate instead of failing the chat. GEMINI_CHAT_MODEL
// in .env, when set, is tried first.
const CHAT_MODEL_CANDIDATES = [
  process.env.GEMINI_CHAT_MODEL,
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter((m, i, arr) => m && arr.indexOf(m) === i);
let workingChatModel = null;
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
  if (status === 404) {
    // Include Google's own reason (usually "model not found") so the
    // failure is self-diagnosing instead of a bare number.
    let reason = "";
    try {
      reason = JSON.parse(detail)?.error?.message || "";
    } catch {
      reason = "";
    }
    return new Error(
      `Gemini API error (404)${reason ? `: ${reason.slice(0, 140)}` : ""}`
    );
  }
  const err = new Error(`Gemini API error (${status}). Please try again.`);
  return err;
}

async function geminiPost(model, action, body) {
  // Hard timeout: without one, a stalled connection to Google leaves
  // the chat hanging on "reading your notes..." forever. A stall
  // becomes a clear, reportable error instead.
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 20000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    console.log(`[gemini] ${action} via ${model}...`);
    res = await fetch(`${API_BASE}/models/${model}:${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Gemini took too long to respond (timeout). Check the internet/VPN connection and try again."
      );
    }
    throw new Error(
      "Could not reach Gemini (network error). Check the internet/VPN connection and try again."
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = friendlyGeminiError(res.status, detail);
    err.status = res.status;
    throw err;
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
// Tries the candidate chat models in order; a 404 means "this key
// can't use that model", so we fall through to the next one and
// remember whichever worked for the rest of the server's run.
export async function generateAnswer(question, contexts) {
  requireKey();

  const body = {
    systemInstruction: { parts: [{ text: ANSWER_SYSTEM_INSTRUCTION }] },
    contents: [
      { role: "user", parts: [{ text: buildAnswerPrompt(question, contexts) }] },
    ],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  const candidates = workingChatModel
    ? [workingChatModel]
    : CHAT_MODEL_CANDIDATES;

  let lastError = null;
  for (const model of candidates) {
    try {
      const data = await geminiPost(model, "generateContent", body);
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts
        .map((p) => p.text || "")
        .join("")
        .trim();
      if (!text) {
        throw new Error("Gemini returned an empty answer. Please try again.");
      }
      workingChatModel = model;
      console.log(`[gemini] answered via ${model}`);
      return text;
    } catch (error) {
      lastError = error;
      if (error.status !== 404) throw error;
      // 404 → this model isn't available on this key; try the next.
      if (workingChatModel === model) workingChatModel = null;
    }
  }

  throw lastError || new Error("No Gemini chat model is available on this API key.");
}
