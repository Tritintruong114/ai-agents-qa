import { API_BASE, DEFAULT_OPENAI_MODEL } from "./constants";
import { loadOpenAiApiKey } from "./openai-key-storage";
import {
  evaluationFromApiBody,
  normalizeStatus,
} from "./evaluation-helpers";
import type {
  ComplianceStatus,
  EvaluateApiSuccess,
  EvaluatePayload,
  EvaluationLog,
  StreamMeta,
} from "./types";

export async function consumeEvaluateSSE(
  res: Response,
  onEvent: (data: Record<string, unknown>) => void,
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Could not read response body.");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (;;) {
      const sep = buffer.indexOf("\n\n");
      if (sep === -1) break;
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      for (const line of raw.split("\n")) {
        if (line.startsWith("data: ")) {
          const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
          onEvent(payload);
        }
      }
    }
  }
}

export async function runSingleEvaluation(
  selectedId: string,
  temperature: number,
  systemPrompt: string,
  onReasoningDelta?: (delta: string) => void,
  prdContext?: string,
  openaiModel: string = DEFAULT_OPENAI_MODEL,
): Promise<{
  evaluation: EvaluatePayload | null;
  meta: StreamMeta | null;
  error: string | null;
  log: EvaluationLog | null;
}> {
  const url = `${API_BASE}/api/evaluate/${encodeURIComponent(selectedId)}`;
  const storedKey = loadOpenAiApiKey();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };
  if (storedKey?.trim()) {
    headers["X-OpenAI-API-Key"] = storedKey.trim();
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      temperature,
      system_prompt: systemPrompt,
      shadow_mode: true,
      model: openaiModel,
      ...(prdContext != null && prdContext !== ""
        ? { prd_context: prdContext }
        : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}: ${res.statusText || "Server error"}`;
    try {
      const errJson = JSON.parse(text) as { detail?: unknown };
      if (typeof errJson.detail === "string") msg = errJson.detail;
    } catch {
      if (text) msg = text;
    }
    return { evaluation: null, meta: null, error: msg, log: null };
  }

  let evaluation: EvaluatePayload | null = null;
  let meta: StreamMeta | null = null;
  let err: string | null = null;
  let resolvedTemperature = temperature;
  let auditLogId: number | undefined;

  await consumeEvaluateSSE(res, (data) => {
    if (typeof data.error === "string") {
      err = data.error;
      return;
    }
    if (typeof data.temperature === "number") {
      resolvedTemperature = data.temperature;
    }
    if (typeof data.audit_log_id === "number") {
      auditLogId = data.audit_log_id;
    }
    if (
      onReasoningDelta &&
      typeof data.reasoning_delta === "string" &&
      data.reasoning_delta
    ) {
      onReasoningDelta(data.reasoning_delta);
    }
    if (data.final_result && typeof data.final_result === "object") {
      const fr = data.final_result as EvaluateApiSuccess;
      evaluation = evaluationFromApiBody(fr);
      if (
        typeof data.model_name === "string" &&
        data.usage &&
        typeof data.usage === "object"
      ) {
        const u = data.usage as {
          prompt_tokens?: number;
          completion_tokens?: number;
        };
        meta = {
          model_name: data.model_name,
          usage: {
            prompt_tokens: Number(u.prompt_tokens ?? 0),
            completion_tokens: Number(u.completion_tokens ?? 0),
          },
        };
      }
    }
  });

  if (err || !evaluation) {
    return { evaluation, meta, error: err, log: null };
  }

  const ev = evaluation as EvaluatePayload;
  const usageMeta = meta as StreamMeta | null;
  const log: EvaluationLog = {
    id: auditLogId,
    test_case_id: selectedId,
    temperature: resolvedTemperature,
    is_ui_description: Boolean(ev.is_ui_description),
    compliance_status:
      normalizeStatus(ev.compliance_status) ??
      (ev.compliance_status as ComplianceStatus) ??
      "—",
    reasoning: ev.reasoning?.trim() ? ev.reasoning : "",
    evidence_quote:
      typeof ev.evidence_quote === "string" ? ev.evidence_quote : undefined,
    prompt_tokens: usageMeta?.usage.prompt_tokens ?? 0,
    completion_tokens: usageMeta?.usage.completion_tokens ?? 0,
    confidence_score:
      typeof ev.confidence_score === "number" ? ev.confidence_score : undefined,
    routing_decision:
      typeof ev.routing_decision === "string" ? ev.routing_decision : undefined,
    llm_reasoning:
      typeof ev.llm_reasoning === "string" ? ev.llm_reasoning : undefined,
    llm_compliance_status:
      typeof ev.llm_compliance_status === "string"
        ? ev.llm_compliance_status
        : undefined,
    readability_dimension: ev.readability_dimension ?? undefined,
  };

  return { evaluation, meta, error: err, log };
}
