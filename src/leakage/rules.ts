import type { LeakageCheck, LeakageType, LeakageSeverity } from "../types/leakage.js"

export interface DatasetProfileSummary {
  columns: { name: string; type: string }[]
  hasTimestampColumn: boolean
  classImbalanceRatio?: number
  hasPotentialGroupColumn?: boolean
}

export interface ExperimentConfig {
  splitStrategy: string
  stratified?: boolean
  groupColumn?: string
}

interface Rule {
  name: string
  type: LeakageType
  severity: LeakageSeverity
  condition: (profile: DatasetProfileSummary, config: ExperimentConfig) => boolean
  message: string
  suggestion: string
}

const RULES: Rule[] = [
  {
    name: "random-split-with-timestamps",
    type: "temporal",
    severity: "warning",
    condition: (p, c) => p.hasTimestampColumn && c.splitStrategy === "random",
    message: "Random split used but dataset has timestamp columns. Temporal leakage likely.",
    suggestion: "Use time-based split or ensure timestamps are not informative for the target.",
  },
  {
    name: "no-stratification-imbalanced",
    type: "validation-strategy",
    severity: "warning",
    condition: (p, c) =>
      (p.classImbalanceRatio ?? 1) > 5 &&
      c.stratified === false &&
      c.splitStrategy === "random",
    message: "No stratification with class imbalance ratio > 5:1. Folds may have very different class distributions.",
    suggestion: "Use stratified splits to maintain class proportions across train/val/test.",
  },
  {
    name: "cv-no-group-check",
    type: "cross-validation",
    severity: "info",
    condition: (p, c) =>
      !!p.hasPotentialGroupColumn &&
      (c.splitStrategy === "kfold" || c.splitStrategy === "stratified_kfold") &&
      !c.groupColumn,
    message: "Cross-validation without group column check. If rows share entities, groups may leak across folds.",
    suggestion: "Check if a group column (user_id, patient_id, etc.) should be used for group k-fold.",
  },
]

export function evaluateRules(profile: DatasetProfileSummary, config: ExperimentConfig): LeakageCheck[] {
  const triggered: LeakageCheck[] = []
  for (const rule of RULES) {
    if (rule.condition(profile, config)) {
      triggered.push({
        type: rule.type,
        name: rule.name,
        passed: false,
        severity: rule.severity,
        message: rule.message,
        suggestion: rule.suggestion,
        evidence: "",
      })
    }
  }
  return triggered
}
