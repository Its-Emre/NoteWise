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
// Static chat-model guesses, tried only if model discovery (below)
// finds nothing. Google retires and renames models over time, so
// these are a last resort, not the plan.
const STATIC_CHAT_FALLBACKS = [
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];
let workingChatModel = null;
let chatCandidatesCache = null;

// Asks the Gemini API itself which models THIS key can actually use
// for generateContent (the ListModels call Google recommends in its
// own 404 message). Names that merely "should" exist kept failing —
// the key's real catalog is the ground truth. Flash models are
// preferred (fast, free-tier friendly), then Pro, then anything
// else; embedding/image/video-only models are excluded.
async function discoverChatModels() {
  try {
    // Bounded like every other Gemini call — discovery must never be
    // the thing that hangs a chat.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(`${API_BASE}/models?pageSize=1000`, {
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return [];
    const data = await res.json();
    const usable = (data.models || [])
      .filter((m) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      )
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(
        (name) =>
          name &&
          !/embedding|aqa|imagen|veo|tts|image|robotics|computer-use/i.test(name)
      );
    const rank = (n) => (/flash/i.test(n) ? 0 : /pro/i.test(n) ? 1 : 2);
    usable.sort((a, b) => rank(a) - rank(b));
    if (usable.length > 0) {
      console.log(
        `[gemini] chat models available on this key: ${usable.slice(0, 6).join(", ")}`
      );
    }
    return usable;
  } catch {
    return []; // discovery is best-effort; static fallbacks remain
  }
}

async function getChatModelCandidates() {
  if (chatCandidatesCache) return chatCandidatesCache;
  const discovered = await discoverChatModels();
  const merged = [
    process.env.GEMINI_CHAT_MODEL,
    ...discovered,
    ...STATIC_CHAT_FALLBACKS,
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);
  chatCandidatesCache = merged;
  return merged;
}
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
  if (status === 503) {
    return new Error(
      "Gemini is overloaded right now (that's on Google's side, not yours). Please try again in a few seconds."
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

async function geminiPost(model, action, body, attempt = 0) {
  // Hard timeout: without one, a stalled connection to Google leaves
  // the chat hanging on "reading your notes..." forever. A stall
  // becomes a clear, reportable error instead.
  const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS) || 30000;
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
      const err = new Error(
        "Gemini took too long to respond (timeout). Check the internet/VPN connection and try again."
      );
      err.code = "GEMINI_TIMEOUT";
      throw err;
    }
    const err = new Error(
      "Could not reach Gemini (network error). Check the internet/VPN connection and try again."
    );
    err.code = "GEMINI_NETWORK";
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // 503/500 from Google usually means "model overloaded" — a
    // transient condition. Wait briefly and retry the same call once
    // before giving up (the chat layer may still fall through to
    // another model afterwards).
    if ((res.status === 503 || res.status === 500) && attempt < 1) {
      console.log(`[gemini] ${model} returned ${res.status} — retrying once...`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return geminiPost(model, action, body, attempt + 1);
    }
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
// Tries the candidate chat models in order; a 404 (model not
// available on this key) or a 503 (model overloaded at Google) falls
// through to the next candidate, and whichever model worked is
// remembered for the rest of the server's run.
export async function generateAnswer(question, contexts) {
  requireKey();

  const body = {
    systemInstruction: { parts: [{ text: ANSWER_SYSTEM_INSTRUCTION }] },
    contents: [
      { role: "user", parts: [{ text: buildAnswerPrompt(question, contexts) }] },
    ],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  const allCandidates = workingChatModel
    ? [workingChatModel]
    : await getChatModelCandidates();
  // Cap the attempts so one bad night at Google can't keep the user
  // waiting through the whole catalog.
  const candidates = allCandidates.slice(0, 4);

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
      // Fall through to the next candidate on anything model- or
      // transport-specific: 404 (not available on this key), 503
      // (overloaded), 429 (this model's quota), timeouts and network
      // stalls. One model hanging must not kill the whole chat —
      // the next one may answer in two seconds.
      const fallthrough =
        error.status === 404 ||
        error.status === 503 ||
        error.status === 429 ||
        error.code === "GEMINI_TIMEOUT" ||
        error.code === "GEMINI_NETWORK";
      if (!fallthrough) throw error;
      console.log(
        `[gemini] ${model} failed (${error.status || error.code || "error"}) — trying next model`
      );
      if (workingChatModel === model) workingChatModel = null;
    }
  }

  throw lastError || new Error("No Gemini chat model is available on this API key.");
}
