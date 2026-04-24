"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AntiPatternTab } from "@/components/AntiPatternTab";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DataContractsTab } from "@/components/DataContractsTab";
import { EvaluationTab } from "@/components/EvaluationTab";
import { GlobalAppHeader } from "@/components/GlobalAppHeader";
import { GoldenDatasetSidebar } from "@/components/GoldenDatasetSidebar";
import { MainTabBar } from "@/components/MainTabBar";
import { PresentationTab } from "@/components/PresentationTab";
import { PromptEngineeringTab } from "@/components/PromptEngineeringTab";
import { PublishFooter } from "@/components/PublishFooter";
import { useEvaluationRun } from "@/context/EvaluationRunContext";
import { useDashboardBootstrap } from "@/hooks/useDashboardBootstrap";
import {
  API_BASE,
  DEFAULT_STABILITY_RUN_COUNT,
  TEST_CASES,
} from "@/lib/constants";
import { fetchTestCaseGoldenContent } from "@/lib/test-case-api";
import {
  clearStoredSystemPrompt,
  saveStoredSystemPrompt,
} from "@/lib/system-prompt-storage";
import {
  createInitialVariant,
  isAllRunsMatchExpected,
} from "@/lib/evaluation-helpers";
import type { AntiPatternRow, AppMode, MainTab, VariantState } from "@/lib/types";

export default function Home() {
  const {
    startStabilityRun,
    blockVariantResetOnCaseChange,
  } = useEvaluationRun();

  const [appMode, setAppMode] = useState<AppMode>("presentation");
  const [mainTab, setMainTab] = useState<MainTab>("evaluation");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedId, setSelectedId] = useState(TEST_CASES[0]?.id ?? "");
  const [abTestingMode, setAbTestingMode] = useState(false);
  const [stabilityRunCount, setStabilityRunCount] = useState(
    DEFAULT_STABILITY_RUN_COUNT,
  );
  const [variantA, setVariantA] = useState<VariantState>(() =>
    createInitialVariant(DEFAULT_STABILITY_RUN_COUNT),
  );
  const [variantB, setVariantB] = useState<VariantState>(() =>
    createInitialVariant(DEFAULT_STABILITY_RUN_COUNT),
  );

  const [antiPatternRows, setAntiPatternRows] = useState<AntiPatternRow[]>([]);
  const [antiPatternLoading, setAntiPatternLoading] = useState(false);
  const [antiPatternError, setAntiPatternError] = useState<string | null>(null);

  const [goldenFromApi, setGoldenFromApi] = useState<
    Record<string, { prd_context: string; text_chunk: string }>
  >({});
  const [goldenContentLoading, setGoldenContentLoading] = useState(false);
  const [goldenContentFetchError, setGoldenContentFetchError] = useState<
    string | null
  >(null);

  const demoActive = appMode === "demo";
  const runsBusy = variantA.loading || variantB.loading;
  const skipVariantReset =
    runsBusy || blockVariantResetOnCaseChange;

  useDashboardBootstrap({
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
  });

  const selected = useMemo(
    () => TEST_CASES.find((c) => c.id === selectedId) ?? null,
    [selectedId],
  );

  useEffect(() => {
    if (!demoActive || !selected?.id) return;
    let cancelled = false;
    setGoldenContentLoading(true);
    setGoldenContentFetchError(null);
    fetchTestCaseGoldenContent(selected.id)
      .then((data) => {
        if (cancelled) return;
        setGoldenFromApi((prev) => ({
          ...prev,
          [data.id]: {
            prd_context: data.prd_context,
            text_chunk: data.text_chunk,
          },
        }));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setGoldenContentFetchError(
          e instanceof Error ? e.message : "Could not load case content.",
        );
      })
      .finally(() => {
        if (!cancelled) setGoldenContentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [demoActive, selected?.id]);

  const selectedForRun = useMemo(() => {
    if (!selected) return null;
    const api = goldenFromApi[selected.id];
    if (!api) return selected;
    return {
      ...selected,
      prdContext: api.prd_context,
      draftText: api.text_chunk,
    };
  }, [selected, goldenFromApi]);

  const handleGoldenContentSaved = useCallback(
    (prd_context: string, text_chunk: string) => {
      if (!selected) return;
      setGoldenFromApi((prev) => ({
        ...prev,
        [selected.id]: { prd_context, text_chunk },
      }));
    },
    [selected],
  );

  const publishDisabled = useMemo(() => {
    if (!selectedForRun) return true;
    if (variantA.loading) return true;
    if (abTestingMode && variantB.loading) return true;
    if (variantA.error || (abTestingMode && variantB.error)) return true;
    const lenOkA =
      variantA.runsHistory.length === stabilityRunCount &&
      variantA.progress >= stabilityRunCount;
    if (
      !lenOkA ||
      !isAllRunsMatchExpected(
        variantA.runsHistory,
        selectedForRun.expectedVerdict,
      )
    )
      return true;
    if (abTestingMode) {
      const lenOkB =
        variantB.runsHistory.length === stabilityRunCount &&
        variantB.progress >= stabilityRunCount;
      if (
        !lenOkB ||
        !isAllRunsMatchExpected(
          variantB.runsHistory,
          selectedForRun.expectedVerdict,
        )
      )
        return true;
    }
    return false;
  }, [selectedForRun, variantA, variantB, abTestingMode, stabilityRunCount]);

  const persistSystemPromptChange = useCallback((value: string) => {
    setSystemPrompt(value);
    saveStoredSystemPrompt(value);
  }, []);

  const resetSystemPromptToServer = useCallback(() => {
    clearStoredSystemPrompt();
    fetch(`${API_BASE}/api/system-prompt`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ system_prompt?: string }>;
      })
      .then((data) => {
        if (typeof data.system_prompt === "string") {
          setSystemPrompt(data.system_prompt);
        }
      })
      .catch(() => {});
  }, []);

  const handleRunVariant = useCallback(
    (which: "a" | "b") => {
      if (!selectedForRun) return;
      const v = which === "a" ? variantA : variantB;
      startStabilityRun({
        which,
        testCase: selectedForRun,
        runCount: stabilityRunCount,
        systemPrompt,
        temperature: v.temperature,
        openaiModel: v.openaiModel,
        setVariant: which === "a" ? setVariantA : setVariantB,
      });
    },
    [
      selectedForRun,
      variantA,
      variantB,
      stabilityRunCount,
      systemPrompt,
      startStabilityRun,
      setVariantA,
      setVariantB,
    ],
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <GlobalAppHeader appMode={appMode} onAppModeChange={setAppMode} />

      {appMode === "presentation" ? (
        <main className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-white">
          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
            <PresentationTab />
          </div>
        </main>
      ) : (
        <div className="flex min-h-[calc(100dvh-3.5rem)] flex-1 flex-col bg-white text-black">
          <DashboardHeader
            stabilityRunCount={stabilityRunCount}
            onStabilityRunCountChange={setStabilityRunCount}
            abTestingMode={abTestingMode}
            onToggleAbTesting={() => setAbTestingMode((v) => !v)}
            runsBusy={runsBusy}
          />

          <div className="grid flex-1 grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <GoldenDatasetSidebar
              selectedId={selectedId}
              onSelectId={setSelectedId}
              caseSwitchDisabled={runsBusy}
            />

            <section className="flex min-h-[70vh] flex-col bg-white">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-8">
                <MainTabBar mainTab={mainTab} onChange={setMainTab} />

                {mainTab === "dataContracts" ? (
                  <DataContractsTab />
                ) : mainTab === "promptEngineering" ? (
                  <PromptEngineeringTab
                    systemPrompt={systemPrompt}
                    onSystemPromptChange={persistSystemPromptChange}
                    onResetToServerDefault={resetSystemPromptToServer}
                    runsBusy={runsBusy}
                  />
                ) : mainTab === "antiPatterns" ? (
                  <AntiPatternTab
                    rows={antiPatternRows}
                    loading={antiPatternLoading}
                    error={antiPatternError}
                  />
                ) : !selectedForRun ? (
                  <p className="text-sm text-neutral-600">Select a test case.</p>
                ) : (
                  <EvaluationTab
                    selected={selectedForRun}
                    goldenContentLoading={goldenContentLoading}
                    goldenContentFetchError={goldenContentFetchError}
                    onGoldenContentSaved={handleGoldenContentSaved}
                    abTestingMode={abTestingMode}
                    stabilityRunCount={stabilityRunCount}
                    variantA={variantA}
                    variantB={variantB}
                    setVariantA={setVariantA}
                    setVariantB={setVariantB}
                    onRunA={() => handleRunVariant("a")}
                    onRunB={() => handleRunVariant("b")}
                  />
                )}
              </div>

              {mainTab === "evaluation" ? (
                <PublishFooter
                  stabilityRunCount={stabilityRunCount}
                  abTestingMode={abTestingMode}
                  publishDisabled={publishDisabled}
                />
              ) : null}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
