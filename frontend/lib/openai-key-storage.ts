const STORAGE_KEY = "ai-agents-qa.openai_api_key";

export function loadOpenAiApiKey(): string | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(STORAGE_KEY);
  return v != null && v.trim() !== "" ? v : null;
}

export function saveOpenAiApiKey(value: string): void {
  const t = value.trim();
  if (t === "") {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, t);
}

export function clearOpenAiApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
