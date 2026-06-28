import { rankByExpectedValue } from "../investigation/hypothesis.js"
import type { HypothesisRecord } from "../types/hypothesis.js"

export class GuidedPattern {
  proposeNextSteps(hypotheses: HypothesisRecord[]): HypothesisRecord[] {
    const pending = hypotheses.filter(h => h.status === "pending")
    return rankByExpectedValue(pending)
  }
}
