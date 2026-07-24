import type { HypothesisRecord } from "./hypothesis.js"
import type { ExperimentJournalRecord, FindingRecord } from "./journal.js"

export interface LoopState {
  budget: number
  experimentsRun: number
  roundsSinceImprovement: number
  targetMetric?: string
  targetValue?: number
  targetDirection?: "above" | "below"
  active: boolean
  bestMetricValue?: number
}

export interface InvestigationMetadata {
  id: string
  goal: string
  status: "active" | "paused" | "closed"
  created: string
  lastActivity: string
  dataset: string
  problemType: string
  currentBest: { metric: string; value: number; experimentId: string } | null
  constraints: string[]
  notes: string[]
  openQuestions: Question[]
  loop?: LoopState
}

export interface Question {
  text: string
  priority: "low" | "medium" | "high"
  addedAt: string
}

export interface Investigation extends InvestigationMetadata {
  hypotheses: HypothesisRecord[]
  experiments: ExperimentJournalRecord[]
  findings: FindingRecord[]
}

export type InvestigationStatus = InvestigationMetadata["status"]
