# NoteWise — Chat with your notes

An AI study assistant built on **RAG (Retrieval-Augmented Generation)**: upload your study PDFs — lecture notes, textbook chapters, previous-year papers — and ask questions. Answers come from *your* material, with sources, instead of a model's general knowledge.

> **Status:** Sprint 1 complete — project setup, authentication, and PDF upload with text extraction. The RAG engine (chunking, embeddings, chat) lands in Sprints 2–3.

## Features

**Sprint 1 (current)**
- Sign up / log in with JWT authentication
- Upload text-based PDFs (up to 10 MB); the server extracts and stores the text
- Personal document library with per-document status (processing / ready / failed) and readable explanations when a PDF can't be read (e.g. scanned images)
- A dark, premium UI: sidebar app shell, landing page, document cards

**Planned**
- Chunking + Gemini embeddings stored in MongoDB; vector retrieval by cosine similarity (Sprint 2)
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
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
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
