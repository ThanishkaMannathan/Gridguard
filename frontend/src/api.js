const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    const message = (body && body.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  health: () => request("/api/health"),
  listRecords: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/records${qs ? `?${qs}` : ""}`);
  },
  getRecord: (id) => request(`/api/records/${id}`),
  classify: (id) => request(`/api/classify/${id}`, { method: "POST" }),
  diagnose: (id) => request(`/api/diagnose/${id}`, { method: "POST" }),
  getReport: (id) => request(`/api/report/${id}`),
  chat: (message) => request(`/api/chat`, { method: "POST", body: JSON.stringify({ message }) }),
};

export const API_BASE_URL = API_URL;
