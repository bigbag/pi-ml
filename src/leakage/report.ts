import type { PreflightResult, LeakageCheck } from "../types/leakage.js"

const SEVERITY_ICONS: Record<string, string> = {
  error: "[BLOCK]",
  warning: "[WARN]",
  info: "[INFO]",
}

function formatCheck(check: LeakageCheck): string {
  const icon = SEVERITY_ICONS[check.severity] ?? "[?]"
  return `${icon} ${check.name} (${check.type})
  ${check.message}
  Fix: ${check.suggestion}`
}

export function formatPreflightReport(result: PreflightResult): string {
  const lines: string[] = []

  if (result.passed) {
    lines.push("Preflight passed — no leakage issues detected.")
  } else {
    lines.push("Preflight FAILED — leakage issues detected.\n")
  }

  if (result.blockers.length > 0) {
    lines.push("BLOCKERS (must fix before running):")
    for (const check of result.blockers) {
      lines.push(formatCheck(check))
    }
    lines.push("")
  }

  if (result.warnings.length > 0) {
    lines.push("WARNINGS (should investigate):")
    for (const check of result.warnings) {
      lines.push(formatCheck(check))
    }
    lines.push("")
  }

  const infos = result.checks.filter(c => !c.passed && c.severity === "info")
  if (infos.length > 0) {
    lines.push("INFO:")
    for (const check of infos) {
      lines.push(formatCheck(check))
    }
  }

  return lines.join("\n")
}
