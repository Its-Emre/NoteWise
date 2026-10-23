// Small fetch wrapper for the NoteWise API.
// In development, Vite proxies "/api" to the Express server (see
// vite.config.js). In production, VITE_API_URL points at the deployed
// backend's /api URL (set in the hosting dashboard, e.g. Vercel).

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("notewise_token");
}

async function request(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

// Variant for multipart uploads: the browser sets the Content-Type header
// (with the boundary) itself, so we must not override it.
async function requestForm(path, formData) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

export const api = {
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  uploadDocument: (formData) => requestForm("/documents", formData),
  getDocuments: () => request("/documents"),
  getDocument: (id) => request(`/documents/${id}`),
  indexDocument: (id) => request(`/documents/${id}/index`, { method: "POST" }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  chat: (payload) =>
    request("/chat", { method: "POST", body: JSON.stringify(payload) }),
};
