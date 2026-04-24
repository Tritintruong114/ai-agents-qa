import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { API_BASE } from "@/lib/constants";
import { loadStoredSystemPrompt } from "@/lib/system-prompt-storage";
import { createInitialVariant } from "@/lib/evaluation-helpers";
import type { AntiPatternRow, MainTab, VariantState } from "@/lib/types";

type Args = {
  demoActive: boolean;
  mainTab: MainTab;
  selectedId: string;
  stabilityRunCount: number;
  /** When true, do not reset judge variants (stability in flight or paused). */
  skipVariantReset: boolean;
  setSystemPrompt: Dispatch<SetStateAction<string>>;
  setVariantA: Dispatch<SetStateAction<VariantState>>;
  setVariantB: Dispatch<SetStateAction<VariantState>>;
  setAntiPatternRows: Dispatch<SetStateAction<AntiPatternRow[]>>;
  setAntiPatternLoading: Dispatch<SetStateAction<boolean>>;
  setAntiPatternError: Dispatch<SetStateAction<string | null>>;
};

export function useDashboardBootstrap({
  demoActive,
  mainTab,
  selectedId,
  stabilityRunCount,
  skipVariantReset,
  setSystemPrompt,
  setVariantA,
  setVariantB,
  setAntiPatternRows,
  setAntiPatternLoading,
  setAntiPatternError,
}: Args) {
  useEffect(() => {
    if (!demoActive || mainTab !== "antiPatterns") return;
    setAntiPatternLoading(true);
    setAntiPatternError(null);
    fetch(`${API_BASE}/api/anti-patterns`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AntiPatternRow[]>;
      })
      .then((data) => {
        setAntiPatternRows(Array.isArray(data) ? data : []);
      })
      .catch((e: unknown) => {
        setAntiPatternError(
          e instanceof Error ? e.message : "Could not load Anti-Patterns.",
        );
        setAntiPatternRows([]);
      })
      .finally(() => setAntiPatternLoading(false));
  }, [
    demoActive,
    mainTab,
    setAntiPatternError,
    setAntiPatternLoading,
    setAntiPatternRows,
  ]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/system-prompt`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ system_prompt?: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        const server =
          typeof data.system_prompt === "string" ? data.system_prompt : "";
        const saved = loadStoredSystemPrompt();
        if (saved !== null && saved.trim().length > 0) {
          setSystemPrompt(saved);
        } else if (server) {
          setSystemPrompt(server);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const saved = loadStoredSystemPrompt();
        if (saved !== null && saved.trim().length > 0) {
          setSystemPrompt(saved);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [setSystemPrompt]);

  useEffect(() => {
    if (skipVariantReset) return;
    setVariantA(createInitialVariant(stabilityRunCount));
    setVariantB(createInitialVariant(stabilityRunCount));
  }, [
    selectedId,
    stabilityRunCount,
    skipVariantReset,
    setVariantA,
    setVariantB,
  ]);
}
