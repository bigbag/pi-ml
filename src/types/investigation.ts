import type { HypothesisRecord } from "./hypothesis.js"
import type { ExperimentJournalRecord, FindingRecord } from "./journal.js"

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
