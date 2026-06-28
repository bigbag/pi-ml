import { rankByExpectedValue } from "../investigation/hypothesis.js"
import type { HypothesisRecord } from "../types/hypothesis.js"

export interface AutoLoopConfig {
  maxExperiments: number
  metricTarget?: {
    metric: string
    target: number
    direction: "above" | "below"
  }
  plateauRounds?: number
}

export interface AutoLoopState {
  experimentsRun: number
  improvements: number[]
  currentMetricValue?: number
  roundsSinceImprovement?: number
}

export class AutoLoopPattern {
  private config: AutoLoopConfig

  constructor(config: AutoLoopConfig) {
    this.config = config
  }

  shouldContinue(state: AutoLoopState): boolean {
    if (state.experimentsRun >= this.config.maxExperiments) return false

    if (this.config.metricTarget && state.currentMetricValue !== undefined) {
      const { target, direction } = this.config.metricTarget
      if (direction === "below" && state.currentMetricValue <= target) return false
      if (direction === "above" && state.currentMetricValue >= target) return false
    }

    if (
      this.config.plateauRounds &&
      state.roundsSinceImprovement !== undefined &&
      state.roundsSinceImprovement >= this.config.plateauRounds
    ) {
      return false
    }

    return true
  }

  selectNextHypothesis(hypotheses: HypothesisRecord[]): HypothesisRecord | null {
    const ranked = rankByExpectedValue(hypotheses)
    const pending = ranked.find(h => h.status === "pending")
    return pending ?? null
  }
}
