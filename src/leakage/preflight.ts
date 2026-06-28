import type { LeakageCheck, PreflightResult } from "../types/leakage.js"
import { evaluateRules } from "./rules.js"
import type { DatasetProfileSummary, ExperimentConfig } from "./rules.js"

export function runPreflight(
  profile: DatasetProfileSummary,
  config: ExperimentConfig,
  extraChecks: LeakageCheck[] = [],
): PreflightResult {
  const ruleChecks = evaluateRules(profile, config)
  const allChecks = [...ruleChecks, ...extraChecks]

  const blockers = allChecks.filter(c => !c.passed && c.severity === "error")
  const warnings = allChecks.filter(c => !c.passed && c.severity === "warning")
  const passed = blockers.length === 0 && warnings.length === 0

  return { passed, checks: allChecks, blockers, warnings }
}
