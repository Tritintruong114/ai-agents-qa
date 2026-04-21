export type ComplianceStatus = "PASS" | "WARNING" | "FAIL" | string;

/** Dimension 08 — from SSE / final_result */
export type ReadabilityDimension = {
  dimension: string;
  status: string;
  score: number | null;
  reasoning: string;
};

export type EvaluatePayload = {
  is_ui_description?: boolean;
  reasoning?: string;
  /** Verbatim excerpt supporting the verdict (Dim 03) */
  evidence_quote?: string;
  compliance_status?: ComplianceStatus;
  /** Dim 03 (LLM) reasoning before merge with Readability */
  llm_reasoning?: string;
  /** SEC status from LLM only (pre-merge) */
  llm_compliance_status?: ComplianceStatus | string;
  readability_dimension?: ReadabilityDimension;
  /** LLM confidence in SEC verdict (0–1), Q8 */
  confidence_score?: number;
  /** calibration_router result (Q8) */
  routing_decision?: string;
  is_shadow_mode?: boolean;
  circuit_breaker?: boolean;
  error?: string;
  detail?: string;
};

export type EvaluateApiSuccess = EvaluatePayload & {
  id?: string | number;
  category?: string;
  title?: string;
  text_chunk?: string;
  old_agent_verdict?: string;
  expected_verdict?: string;
  evaluation?: EvaluatePayload;
};

export type StreamMeta = {
  model_name: string;
  usage: { prompt_tokens: number; completion_tokens: number };
};

export type EvaluationLog = {
  id?: number;
  test_case_id: string;
  temperature: number;
  is_ui_description: boolean;
  compliance_status: ComplianceStatus;
  reasoning: string;
  evidence_quote?: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  confidence_score?: number | null;
  routing_decision?: string | null;
  llm_reasoning?: string | null;
  llm_compliance_status?: string | null;
  readability_dimension?: ReadabilityDimension | null;
};

export type RunSlot = EvaluationLog | null;

export type AntiPatternRow = {
  id: number;
  test_case_id: string;
  temperature: number;
  is_ui_description: boolean;
  compliance_status: string;
  reasoning: string;
  evidence_quote?: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  created_at: string;
  confidence_score?: number | null;
  routing_decision?: string | null;
};

export type VariantState = {
  /** OpenAI model id passed to `/api/evaluate` (e.g. gpt-4o). */
  openaiModel: string;
  temperature: number;
  loading: boolean;
  evaluationResult: EvaluatePayload | null;
  streamReasoning: string;
  evalMeta: StreamMeta | null;
  error: string | null;
  runsHistory: RunSlot[];
  snapshotRunIndex: number | null;
  progress: number;
  totalTokens: { prompt: number; completion: number };
};

export type AppMode = "presentation" | "demo";

export type MainTab =
  | "evaluation"
  | "promptEngineering"
  | "antiPatterns"
  | "dataContracts";
