"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { runSingleEvaluation } from "@/lib/evaluate-api";
import type { TestCase } from "@/lib/constants";
import type {
  ActiveStabilityRun,
  CompletedStabilityRunRecord,
  EvaluatePayload,
  EvaluationLog,
  RunSlot,
  StreamMeta,
  VariantState,
} from "@/lib/types";

const MAX_COMPLETED = 24;

type Which = "a" | "b";

type JobRefs = {
  abort: AbortController | null;
  paused: boolean;
  cancelled: boolean;
  pauseWaitResolve: (() => void) | null;
};

function emptyJobRefs(): JobRefs {
  return {
    abort: null,
    paused: false,
    cancelled: false,
    pauseWaitResolve: null,
  };
}

function cloneVariant(v: VariantState): VariantState {
  return JSON.parse(JSON.stringify(v)) as VariantState;
}

type StartStabilityRunArgs = {
  which: Which;
  testCase: TestCase;
  runCount: number;
  systemPrompt: string;
  temperature: number;
  openaiModel: string;
  setVariant: Dispatch<SetStateAction<VariantState>>;
};

type EvaluationRunContextValue = {
  activeRunA: ActiveStabilityRun | null;
  activeRunB: ActiveStabilityRun | null;
  completedRuns: CompletedStabilityRunRecord[];
  startStabilityRun: (args: StartStabilityRunArgs) => void;
  pauseStabilityRun: (which: Which) => void;
  resumeStabilityRun: (which: Which) => void;
  cancelStabilityRun: (which: Which) => void;
  /** Skip resetting variants when switching case while a batch is in flight or paused. */
  blockVariantResetOnCaseChange: boolean;
};

const EvaluationRunContext = createContext<EvaluationRunContextValue | null>(
  null,
);

let _runIdSeq = 0;
function makeRunId(): string {
  _runIdSeq += 1;
  return `${Date.now().toString(36)}-${_runIdSeq}-${Math.random().toString(36).slice(2, 9)}`;
}

async function waitWhilePaused(
  which: Which,
  jobRef: MutableRefObject<Record<Which, JobRefs>>,
): Promise<void> {
  for (;;) {
    const j = jobRef.current[which];
    if (!j.paused || j.cancelled) return;
    await new Promise<void>((resolve) => {
      jobRef.current[which].pauseWaitResolve = resolve;
    });
  }
}

function wakePauseWaiter(which: Which, jobRef: MutableRefObject<Record<Which, JobRefs>>) {
  const r = jobRef.current[which].pauseWaitResolve;
  jobRef.current[which].pauseWaitResolve = null;
  r?.();
}

export function EvaluationRunProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const jobRef = useRef<Record<Which, JobRefs>>({
    a: emptyJobRefs(),
    b: emptyJobRefs(),
  });

  const [activeRunA, setActiveRunA] = useState<ActiveStabilityRun | null>(null);
  const [activeRunB, setActiveRunB] = useState<ActiveStabilityRun | null>(null);
  const [completedRuns, setCompletedRuns] = useState<CompletedStabilityRunRecord[]>(
    [],
  );

  const setActiveFor = useCallback((which: Which, run: ActiveStabilityRun | null) => {
    if (which === "a") setActiveRunA(run);
    else setActiveRunB(run);
  }, []);

  const pushCompleted = useCallback((record: CompletedStabilityRunRecord) => {
    setCompletedRuns((prev) => {
      const next = [record, ...prev.filter((x) => x.id !== record.id)];
      return next.slice(0, MAX_COMPLETED);
    });
  }, []);

  const runLoop = useCallback(
    async (args: StartStabilityRunArgs) => {
      const { which, testCase, runCount, systemPrompt, temperature, openaiModel, setVariant } =
        args;
      const setV = setVariant;
      const total = Math.max(1, runCount);
      const runId = makeRunId();

      jobRef.current[which] = emptyJobRefs();
      const ac = new AbortController();
      jobRef.current[which].abort = ac;

      setActiveFor(which, {
        id: runId,
        which,
        testCaseId: testCase.id,
        testCaseTitle: testCase.title,
        stabilityRunCount: total,
        progress: 0,
        phase: "running",
      });

      setV({
        openaiModel,
        temperature,
        loading: true,
        evaluationResult: null,
        streamReasoning: "",
        evalMeta: null,
        error: null,
        runsHistory: Array.from({ length: total }, () => null),
        snapshotRunIndex: null,
        progress: 0,
        totalTokens: { prompt: 0, completion: 0 },
      });

      const hist: RunSlot[] = Array.from({ length: total }, () => null);
      let accP = 0;
      let accC = 0;
      let lastModel = "";
      let lastEval: EvaluatePayload | null = null;

      const finishActive = () => {
        setActiveFor(which, null);
        jobRef.current[which] = emptyJobRefs();
      };

      try {
        for (let i = 0; i < total; i++) {
          await waitWhilePaused(which, jobRef);
          if (jobRef.current[which].cancelled) {
            setV((s) => ({
              ...s,
              loading: false,
              error: s.error ?? "Cancelled.",
              runsHistory: [...hist],
              progress: i,
            }));
            pushCompleted({
              id: runId,
              which,
              testCaseId: testCase.id,
              testCaseTitle: testCase.title,
              stabilityRunCount: total,
              variantSnapshot: cloneVariant({
                openaiModel,
                temperature,
                loading: false,
                evaluationResult: lastEval,
                streamReasoning: "",
                evalMeta: lastModel
                  ? {
                      model_name: lastModel,
                      usage: { prompt_tokens: accP, completion_tokens: accC },
                    }
                  : null,
                error: "Cancelled.",
                runsHistory: [...hist],
                snapshotRunIndex: null,
                progress: i,
                totalTokens: { prompt: accP, completion: accC },
              }),
              finishedAt: Date.now(),
              outcome: "cancelled",
            });
            return;
          }

          setV((s) => ({
            ...s,
            progress: i + 1,
            streamReasoning: i === total - 1 ? "" : s.streamReasoning,
          }));
          const phase: ActiveStabilityRun["phase"] = jobRef.current[which].paused
            ? "paused"
            : "running";
          if (which === "a") {
            setActiveRunA((prev) =>
              prev && prev.id === runId
                ? { ...prev, progress: i + 1, phase }
                : prev,
            );
          } else {
            setActiveRunB((prev) =>
              prev && prev.id === runId
                ? { ...prev, progress: i + 1, phase }
                : prev,
            );
          }

          const isLast = i === total - 1;
          const onDelta = isLast
            ? (d: string) =>
                setV((s) => ({
                  ...s,
                  streamReasoning: s.streamReasoning + d,
                }))
            : undefined;

          let evaluation: EvaluatePayload | null = null;
          let meta: StreamMeta | null = null;
          let error: string | null = null;
          let log: EvaluationLog | null = null;

          try {
            const result = await runSingleEvaluation(
              testCase.id,
              temperature,
              systemPrompt,
              onDelta,
              testCase.prdContext,
              openaiModel,
              ac.signal,
            );
            evaluation = result.evaluation;
            meta = result.meta;
            error = result.error;
            log = result.log;
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") {
              setV((s) => ({
                ...s,
                loading: false,
                error: "Cancelled.",
                runsHistory: [...hist],
                progress: i,
              }));
              pushCompleted({
                id: runId,
                which,
                testCaseId: testCase.id,
                testCaseTitle: testCase.title,
                stabilityRunCount: total,
                variantSnapshot: cloneVariant({
                  openaiModel,
                  temperature,
                  loading: false,
                  evaluationResult: lastEval,
                  streamReasoning: "",
                  evalMeta: lastModel
                    ? {
                        model_name: lastModel,
                        usage: { prompt_tokens: accP, completion_tokens: accC },
                      }
                    : null,
                  error: "Cancelled.",
                  runsHistory: [...hist],
                  snapshotRunIndex: null,
                  progress: i,
                  totalTokens: { prompt: accP, completion: accC },
                }),
                finishedAt: Date.now(),
                outcome: "cancelled",
              });
              return;
            }
            const message =
              e instanceof Error ? e.message : "Could not reach the API.";
            setV((s) => ({ ...s, loading: false, error: message, runsHistory: [...hist] }));
            pushCompleted({
              id: runId,
              which,
              testCaseId: testCase.id,
              testCaseTitle: testCase.title,
              stabilityRunCount: total,
              variantSnapshot: cloneVariant({
                openaiModel,
                temperature,
                loading: false,
                evaluationResult: lastEval,
                streamReasoning: "",
                evalMeta: lastModel
                  ? {
                      model_name: lastModel,
                      usage: { prompt_tokens: accP, completion_tokens: accC },
                    }
                  : null,
                error: message,
                runsHistory: [...hist],
                snapshotRunIndex: null,
                progress: i,
                totalTokens: { prompt: accP, completion: accC },
              }),
              finishedAt: Date.now(),
              outcome: "error",
            });
            return;
          }

          if (error) {
            setV((s) => ({
              ...s,
              loading: false,
              error,
              runsHistory: [...hist],
            }));
            pushCompleted({
              id: runId,
              which,
              testCaseId: testCase.id,
              testCaseTitle: testCase.title,
              stabilityRunCount: total,
              variantSnapshot: cloneVariant({
                openaiModel,
                temperature,
                loading: false,
                evaluationResult: lastEval,
                streamReasoning: "",
                evalMeta: lastModel
                  ? {
                      model_name: lastModel,
                      usage: { prompt_tokens: accP, completion_tokens: accC },
                    }
                  : null,
                error,
                runsHistory: [...hist],
                snapshotRunIndex: null,
                progress: i + 1,
                totalTokens: { prompt: accP, completion: accC },
              }),
              finishedAt: Date.now(),
              outcome: "error",
            });
            return;
          }

          hist[i] = log;
          if (meta) {
            accP += meta.usage.prompt_tokens;
            accC += meta.usage.completion_tokens;
            lastModel = meta.model_name;
          }
          lastEval = evaluation;

          setV((s) => ({
            ...s,
            runsHistory: [...hist],
            progress: i + 1,
          }));
        }

        setV((prev) => {
          const next: VariantState = {
            openaiModel,
            temperature,
            loading: false,
            evaluationResult: lastEval,
            streamReasoning: "",
            evalMeta: {
              model_name: lastModel,
              usage: { prompt_tokens: accP, completion_tokens: accC },
            },
            error: null,
            runsHistory: [...hist],
            // Keep which stability dot the user was reading; do not force only "last" run.
            snapshotRunIndex: prev.snapshotRunIndex,
            progress: total,
            totalTokens: { prompt: accP, completion: accC },
          };
          const snapshot = cloneVariant(next);
          queueMicrotask(() => {
            pushCompleted({
              id: runId,
              which,
              testCaseId: testCase.id,
              testCaseTitle: testCase.title,
              stabilityRunCount: total,
              variantSnapshot: snapshot,
              finishedAt: Date.now(),
              outcome: "completed",
            });
          });
          return next;
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not reach the API.";
        setV((s) => ({ ...s, loading: false, error: message }));
        pushCompleted({
          id: runId,
          which,
          testCaseId: testCase.id,
          testCaseTitle: testCase.title,
          stabilityRunCount: total,
          variantSnapshot: cloneVariant({
            openaiModel,
            temperature,
            loading: false,
            evaluationResult: lastEval,
            streamReasoning: "",
            evalMeta: lastModel
              ? {
                  model_name: lastModel,
                  usage: { prompt_tokens: accP, completion_tokens: accC },
                }
              : null,
            error: message,
            runsHistory: [...hist],
            snapshotRunIndex: null,
            progress: hist.filter((x) => x !== null).length,
            totalTokens: { prompt: accP, completion: accC },
          }),
          finishedAt: Date.now(),
          outcome: "error",
        });
      } finally {
        finishActive();
      }
    },
    [pushCompleted, setActiveFor, setActiveRunA, setActiveRunB],
  );

  const startStabilityRun = useCallback(
    (args: StartStabilityRunArgs) => {
      const { which, setVariant } = args;
      let busy = false;
      setVariant((s) => {
        busy = s.loading;
        return s;
      });
      if (busy) return;
      void runLoop(args);
    },
    [runLoop],
  );

  const pauseStabilityRun = useCallback((which: Which) => {
    if (!jobRef.current[which].abort) return;
    jobRef.current[which].paused = true;
    if (which === "a") {
      setActiveRunA((prev) => (prev ? { ...prev, phase: "paused" } : prev));
    } else {
      setActiveRunB((prev) => (prev ? { ...prev, phase: "paused" } : prev));
    }
  }, []);

  const resumeStabilityRun = useCallback((which: Which) => {
    if (!jobRef.current[which].abort) return;
    jobRef.current[which].paused = false;
    wakePauseWaiter(which, jobRef);
    if (which === "a") {
      setActiveRunA((prev) => (prev ? { ...prev, phase: "running" } : prev));
    } else {
      setActiveRunB((prev) => (prev ? { ...prev, phase: "running" } : prev));
    }
  }, []);

  const cancelStabilityRun = useCallback(
    (which: Which) => {
      if (!jobRef.current[which].abort) return;
      jobRef.current[which].cancelled = true;
      jobRef.current[which].paused = false;
      wakePauseWaiter(which, jobRef);
      try {
        jobRef.current[which].abort?.abort();
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const blockVariantResetOnCaseChange = Boolean(
    activeRunA || activeRunB,
  );

  const value = useMemo<EvaluationRunContextValue>(
    () => ({
      activeRunA,
      activeRunB,
      completedRuns,
      startStabilityRun,
      pauseStabilityRun,
      resumeStabilityRun,
      cancelStabilityRun,
      blockVariantResetOnCaseChange,
    }),
    [
      activeRunA,
      activeRunB,
      blockVariantResetOnCaseChange,
      cancelStabilityRun,
      completedRuns,
      pauseStabilityRun,
      resumeStabilityRun,
      startStabilityRun,
    ],
  );

  return (
    <EvaluationRunContext.Provider value={value}>
      {children}
    </EvaluationRunContext.Provider>
  );
}

export function useEvaluationRun(): EvaluationRunContextValue {
  const ctx = useContext(EvaluationRunContext);
  if (!ctx) {
    throw new Error("useEvaluationRun must be used within EvaluationRunProvider");
  }
  return ctx;
}
