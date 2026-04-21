"use client";

import { useEffect, useId, useState } from "react";
import {
  clearOpenAiApiKey,
  loadOpenAiApiKey,
  saveOpenAiApiKey,
} from "@/lib/openai-key-storage";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function OpenAiKeyConfigModal({ open, onClose }: Props) {
  const titleId = useId();
  const [value, setValue] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(loadOpenAiApiKey() ?? "");
    setShowSecret(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id={titleId}
          className="text-sm font-semibold text-neutral-900"
        >
          OpenAI API key
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
          Stored only in this browser (localStorage). Sent to your local API as{" "}
          <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
            X-OpenAI-API-Key
          </code>{" "}
          when you run evaluations. If empty, the server uses{" "}
          <code className="rounded bg-neutral-100 px-1 font-mono text-[11px]">
            OPENAI_API_KEY
          </code>{" "}
          from its environment.
        </p>
        <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Secret key
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type={showSecret ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="sk-…"
            className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2.5 py-2 font-mono text-xs text-neutral-900 outline-none focus:border-[#0066ff] focus:ring-1 focus:ring-[#0066ff]"
          />
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="shrink-0 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {showSecret ? "Hide" : "Show"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              clearOpenAiApiKey();
              setValue("");
              onClose();
            }}
            className="mr-auto text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-800 hover:underline"
          >
            Remove stored key
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              saveOpenAiApiKey(value);
              onClose();
            }}
            className="rounded-lg bg-[#0066ff] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0052cc]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
