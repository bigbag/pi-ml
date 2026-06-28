export type LeakageType =
  | "train-test-contamination"
  | "temporal"
  | "preprocessing"
  | "feature"
  | "cross-validation"
  | "validation-strategy"

export type LeakageSeverity = "error" | "warning" | "info"

export interface LeakageCheck {
  type: LeakageType
  name: string
  passed: boolean
  severity: LeakageSeverity
  message: string
  suggestion: string
  evidence: string
}

export interface PreflightResult {
  passed: boolean
  checks: LeakageCheck[]
  blockers: LeakageCheck[]
  warnings: LeakageCheck[]
}
