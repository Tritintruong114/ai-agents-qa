/** Client-only persistence so edited judge prompts survive refresh (PoC). */
export const SYSTEM_PROMPT_STORAGE_KEY = "ai-agents-qa.system-prompt.v1";

export function loadStoredSystemPrompt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(SYSTEM_PROMPT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveStoredSystemPrompt(text: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SYSTEM_PROMPT_STORAGE_KEY, text);
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredSystemPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SYSTEM_PROMPT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
