export interface HypothesisRecord {
  id: string
  investigationId: string
  text: string
  rationale: string
  status: "pending" | "testing" | "confirmed" | "rejected"
  expectedImpact: "low" | "medium" | "high"
  experiments: string[]
  outcome: string
  timestamp: string
}

export type HypothesisStatus = HypothesisRecord["status"]
