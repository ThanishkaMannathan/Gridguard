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
  getReport: (id, diagnosis = null) => {
    if (diagnosis) {
      return request(`/api/report/${id}`, {
        method: "POST",
        body: JSON.stringify({
          diagnosis_text: diagnosis.diagnosis,
          sources: (diagnosis.sources || []).map((s) => s.source),
        }),
      });
    }
    return request(`/api/report/${id}`);
  },
  downloadReportPdf: async (id, diagnosis = null) => {
    const options = { method: diagnosis ? "POST" : "GET" };
    if (diagnosis) {
      options.body = JSON.stringify({
        diagnosis_text: diagnosis.diagnosis,
        sources: (diagnosis.sources || []).map((s) => s.source),
      });
      options.headers = { "Content-Type": "application/json" };
    }
    const res = await fetch(`${API_URL}/api/report/${id}?format=pdf`, options);
    if (!res.ok) throw new Error("Failed to generate PDF");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridguard_report_${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
  chat: (message) => request(`/api/chat`, { method: "POST", body: JSON.stringify({ message }) }),
};

export const API_BASE_URL = API_URL;
