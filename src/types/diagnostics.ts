export type FailureType =
  | "overfitting"
  | "underfitting"
  | "instability"
  | "generalization"
  | "imbalance"
  | "convergence"
  | "unknown"

export interface DiagnosticCheck {
  name: string
  description: string
  check: string
  result: "pass" | "fail" | "inconclusive"
  evidence: string
}

export interface DiagnosticResult {
  failureType: FailureType
  checks: DiagnosticCheck[]
  rootCause: string | null
  suggestions: string[]
  confidence: "low" | "medium" | "high"
}

export interface DebugHypothesis {
  id: string
  cause: string
  likelihood: "low" | "medium" | "high"
  testPlan: string
  status: "pending" | "testing" | "confirmed" | "eliminated"
  evidence: string
}
