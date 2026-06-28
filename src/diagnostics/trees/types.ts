import type { FailureType } from "../../types/diagnostics.js"

export interface DiagnosticNode {
  check: string
  indicators: string[]
  suggestions: string[]
  children?: DiagnosticNode[]
}

export interface DiagnosticTree {
  failureType: FailureType
  triggerCondition: string
  nodes: DiagnosticNode[]
}
