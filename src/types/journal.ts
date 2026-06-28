export interface ExperimentJournalRecord {
  id: string
  investigationId: string
  hypothesisId: string
  timestamp: string
  config: {
    model: string
    features: string[]
    params: Record<string, unknown>
  }
  metrics: Record<string, number>
  duration: number
  outcome: "improvement" | "regression" | "neutral" | "error"
  notes: string
}

export interface FindingRecord {
  id: string
  investigationId: string
  type: "insight" | "warning" | "decision"
  text: string
  sourceExperiments: string[]
  tags: string[]
  timestamp: string
}
