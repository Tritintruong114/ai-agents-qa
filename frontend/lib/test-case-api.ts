import { API_BASE } from "./constants";

export type TestCaseGoldenPayload = {
  id: string;
  title: string;
  category: string;
  expected_verdict: string;
  prd_context: string;
  text_chunk: string;
};

export async function fetchTestCaseGoldenContent(
  itemId: string,
): Promise<TestCaseGoldenPayload> {
  const url = `${API_BASE}/api/test-cases/${encodeURIComponent(itemId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<TestCaseGoldenPayload>;
}

export async function saveTestCaseGoldenContent(
  itemId: string,
  body: { prd_context: string; text_chunk: string },
): Promise<TestCaseGoldenPayload> {
  const url = `${API_BASE}/api/test-cases/${encodeURIComponent(itemId)}/golden-content`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      if (typeof j.detail === "string") msg = j.detail;
    } catch {
      if (text) msg = text;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<TestCaseGoldenPayload>;
}
