"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useDashboardBootstrap } from "@/hooks/useDashboardBootstrap";
import { useStabilityRunner } from "@/hooks/useStabilityRunner";
import {
  API_BASE,
  DEFAULT_STABILITY_RUN_COUNT,
  TEST_CASES,
} from "@/lib/constants";
import {
  clearStoredSystemPrompt,
  saveStoredSystemPrompt,
} from "@/lib/system-prompt-storage";
import {
  createInitialVariant,
  isAllRunsMatchExpected,
} from "@/lib/evaluation-helpers";
import type {
  AntiPatternRow,
  AppMode,
  MainTab,
  VariantState,
} from "@/lib/types";

export default function Home() {
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

  const demoActive = appMode === "demo";

  useDashboardBootstrap({
    demoActive,
    mainTab,
    selectedId,
    stabilityRunCount,
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

  const runsBusy = variantA.loading || variantB.loading;
  const runStabilityVariant = useStabilityRunner(
    selected,
    setVariantA,
    setVariantB,
  );

  const publishDisabled = useMemo(() => {
    if (!selected) return true;
    if (variantA.loading) return true;
    if (abTestingMode && variantB.loading) return true;
    if (variantA.error || (abTestingMode && variantB.error)) return true;
    const lenOkA =
      variantA.runsHistory.length === stabilityRunCount &&
      variantA.progress >= stabilityRunCount;
    if (
      !lenOkA ||
      !isAllRunsMatchExpected(variantA.runsHistory, selected.expectedVerdict)
    )
      return true;
    if (abTestingMode) {
      const lenOkB =
        variantB.runsHistory.length === stabilityRunCount &&
        variantB.progress >= stabilityRunCount;
      if (
        !lenOkB ||
        !isAllRunsMatchExpected(variantB.runsHistory, selected.expectedVerdict)
      )
        return true;
    }
    return false;
  }, [selected, variantA, variantB, abTestingMode, stabilityRunCount]);

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
      const v = which === "a" ? variantA : variantB;
      runStabilityVariant(
        which,
        v.temperature,
        stabilityRunCount,
        systemPrompt,
        v.openaiModel,
      );
    },
    [
      runStabilityVariant,
      variantA,
      variantB,
      stabilityRunCount,
      systemPrompt,
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
                ) : !selected ? (
                  <p className="text-sm text-neutral-600">Select a test case.</p>
                ) : (
                  <EvaluationTab
                    selected={selected}
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
