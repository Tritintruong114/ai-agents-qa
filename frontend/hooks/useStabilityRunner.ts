import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { runSingleEvaluation } from "@/lib/evaluate-api";
import type { EvaluatePayload, RunSlot, VariantState } from "@/lib/types";

type SetV = Dispatch<SetStateAction<VariantState>>;

export function useStabilityRunner(
  selectedId: string,
  setVariantA: SetV,
  setVariantB: SetV,
) {
  return useCallback(
    async (
      which: "a" | "b",
      temperature: number,
      runCount: number,
      judgeSystemPrompt: string,
    ) => {
      if (!selectedId) return;
      const setV = which === "a" ? setVariantA : setVariantB;
      const total = Math.max(1, runCount);

      setV({
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

      try {
        for (let i = 0; i < total; i++) {
          setV((s) => ({
            ...s,
            progress: i + 1,
            streamReasoning: i === total - 1 ? "" : s.streamReasoning,
          }));

          const isLast = i === total - 1;
          const onDelta = isLast
            ? (d: string) =>
                setV((s) => ({
                  ...s,
                  streamReasoning: s.streamReasoning + d,
                }))
            : undefined;

          const { evaluation, meta, error, log } = await runSingleEvaluation(
            selectedId,
            temperature,
            judgeSystemPrompt,
            onDelta,
          );

          if (error) {
            setV((s) => ({
              ...s,
              loading: false,
              error,
              runsHistory: [...hist],
            }));
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

        setV({
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
          snapshotRunIndex: null,
          progress: total,
          totalTokens: { prompt: accP, completion: accC },
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not reach the API.";
        setV((s) => ({ ...s, loading: false, error: message }));
      }
    },
    [selectedId, setVariantA, setVariantB],
  );
}
