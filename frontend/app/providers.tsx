"use client";

import type { ReactNode } from "react";
import { EvaluationRunProvider } from "@/context/EvaluationRunContext";

export function Providers({ children }: { children: ReactNode }) {
  return <EvaluationRunProvider>{children}</EvaluationRunProvider>;
}
