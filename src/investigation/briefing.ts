import type { Investigation } from "../types/investigation.js"

export function generateBriefing(inv: Investigation): string {
  const lines: string[] = []

  lines.push(`## Investigation: ${inv.goal}`)
  lines.push(`**Status:** ${inv.status} | **Dataset:** ${inv.dataset} | **Type:** ${inv.problemType}`)

  if (inv.currentBest) {
    lines.push(`**Current best:** ${inv.currentBest.metric} = ${inv.currentBest.value} (${inv.currentBest.experimentId})`)
  } else {
    lines.push("**Current best:** none yet")
  }

  if (inv.experiments.length > 0) {
    lines.push(`**Experiments:** ${inv.experiments.length} experiment${inv.experiments.length === 1 ? "" : "s"} run`)
  } else {
    lines.push("**Experiments:** No experiments run yet")
  }

  if (inv.hypotheses.length > 0) {
    const counts: Record<string, number> = {}
    for (const h of inv.hypotheses) {
      counts[h.status] = (counts[h.status] ?? 0) + 1
    }
    const parts = Object.entries(counts).map(([status, count]) => `${count} ${status}`)
    lines.push(`**Hypotheses:** ${parts.join(", ")}`)
  } else {
    lines.push("**Hypotheses:** none")
  }

  if (inv.openQuestions.length > 0) {
    lines.push("**Open questions:**")
    for (const q of inv.openQuestions) {
      lines.push(`  - [${q.priority}] ${q.text}`)
    }
  }

  if (inv.findings.length > 0) {
    lines.push("**Recent findings:**")
    for (const f of inv.findings.slice(-3)) {
      lines.push(`  - [${f.type}] ${f.text}`)
    }
  }

  if (inv.constraints.length > 0) {
    lines.push(`**Constraints:** ${inv.constraints.join(", ")}`)
  }

  return lines.join("\n")
}
