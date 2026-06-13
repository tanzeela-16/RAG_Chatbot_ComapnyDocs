const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadDocument(file: File, sessionId: string) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/upload/${sessionId}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function sendMessage(message: string, sessionId: string, history: {role:string,content:string}[]) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId, history }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocuments(sessionId: string) {
  const res = await fetch(`${BASE}/api/documents/${sessionId}`);
  return res.json();
}

export async function deleteDocuments(sessionId: string) {
  await fetch(`${BASE}/api/documents/${sessionId}`, { method: "DELETE" });
}