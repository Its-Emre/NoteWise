# NoteWise — Chat with your notes

An AI study assistant built on **RAG (Retrieval-Augmented Generation)**: upload your study PDFs — lecture notes, textbook chapters, previous-year papers — and ask questions. Answers come from *your* material, with sources, instead of a model's general knowledge.

> **Status:** Sprint 2 complete — the RAG engine: documents are chunked, embedded with Google Gemini and stored as vectors in MongoDB, and a retrieval endpoint returns the most relevant chunks for any question. The chat UI lands in Sprint 3.

## Features

**Sprint 1 (current)**
- Sign up / log in with JWT authentication
- Upload text-based PDFs (up to 10 MB); the server extracts and stores the text
- Personal document library with per-document status (processing / ready / failed) and readable explanations when a PDF can't be read (e.g. scanned images)
- A dark, premium UI: sidebar app shell, landing page, document cards

**Sprint 2 (current)**
- Everything in Sprint 1, plus the RAG engine:
- Uploaded documents are split into overlapping chunks (~900 characters, 150 overlap) and embedded with **Google Gemini** (`gemini-embedding-001`, 768 dimensions, retrieval task types)
- Chunks + vectors are stored in MongoDB; the Library shows each document's chunk count, or an **Enable AI search** button to index it
- `POST /api/retrieve` embeds a question and returns the top matching chunks, ranked by **cosine similarity computed in the backend** — the retrieval core the chat is built on

**Planned**
- Chat UI with grounded answers and source citations (Sprint 3)
- Deployment on Vercel + Render (Sprint 4)

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT + bcryptjs |
| PDF parsing | unpdf (pdf.js) |
| AI (from Sprint 2) | Google Gemini — embeddings + Flash, free tier |

## Run it locally

You need Node.js and a MongoDB Atlas connection string.

```bash
# 1. Backend
cd server
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET and GEMINI_API_KEY (free from Google AI Studio)
npm install
npm run dev            # http://localhost:5000 — check /api/health

# 2. Frontend (new terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

The frontend dev server proxies `/api` to the backend, so no extra configuration is needed locally. For production, set `VITE_API_URL` on the frontend host to the deployed backend's `/api` URL, and `CLIENT_URL` on the backend to the frontend's URL.

## Project layout

```
client/   React app — pages (Landing, Login, Register, Library), sidebar shell, API client
server/   Express API — auth routes, document upload + PDF text extraction, Mongoose models
```
