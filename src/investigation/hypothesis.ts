import { createHash } from "node:crypto"
import type { HypothesisRecord } from "../types/hypothesis.js"

const IMPACT_SCORE: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

export function generateHypothesisId(text: string): string {
  return "hyp-" + createHash("sha256").update(text + Date.now()).digest("hex").slice(0, 8)
}

export function rankByExpectedValue(hypotheses: HypothesisRecord[]): HypothesisRecord[] {
  return [...hypotheses].sort((a, b) => {
    const aPending = a.status === "pending" ? 1 : 0
    const bPending = b.status === "pending" ? 1 : 0
    if (aPending !== bPending) return bPending - aPending
    return (IMPACT_SCORE[b.expectedImpact] ?? 0) - (IMPACT_SCORE[a.expectedImpact] ?? 0)
  })
}
