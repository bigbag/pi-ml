import * as crypto from "node:crypto"
import type { DebugHypothesis } from "../types/diagnostics.js"
import type { Evidence } from "./classifier.js"
import type { FindingRecord } from "../types/journal.js"

interface HypothesisTemplate {
  cause: string
  testPlan: string
  likelihood: DebugHypothesis["likelihood"]
  keywords: string[]
}

const TEMPLATES: HypothesisTemplate[] = [
  {
    cause: "Insufficient model capacity for the data complexity",
    testPlan: "Try a more expressive model or increase depth/width and compare metrics",
    likelihood: "high",
    keywords: ["capacity", "complexity", "expressive"],
  },
  {
    cause: "Poor feature quality — missing key signals",
    testPlan: "Run feature importance analysis and engineer new features from domain knowledge",
    likelihood: "high",
    keywords: ["feature", "quality", "signal"],
  },
  {
    cause: "Learning rate misconfigured for this problem",
    testPlan: "Run learning rate sweep (1e-5 to 1e-1) and plot loss curves",
    likelihood: "medium",
    keywords: ["learning rate", "lr", "step size"],
  },
  {
    cause: "Data quality issues — noise, mislabeling, or missing values",
    testPlan: "Audit a random sample of training data for correctness and completeness",
    likelihood: "medium",
    keywords: ["data quality", "noise", "mislabel"],
  },
  {
    cause: "Inappropriate preprocessing — scaling, encoding, or imputation",
    testPlan: "Review preprocessing pipeline and try alternative strategies",
    likelihood: "medium",
    keywords: ["preprocessing", "scaling", "encoding"],
  },
  {
    cause: "Wrong problem framing — regression vs classification, target definition",
    testPlan: "Revisit problem definition and verify target variable is correctly defined",
    likelihood: "low",
    keywords: ["framing", "target", "definition"],
  },
  {
    cause: "Training instability from numerical issues",
    testPlan: "Check for inf/NaN in data, add gradient clipping, try different optimizer",
    likelihood: "low",
    keywords: ["instability", "numerical", "nan"],
  },
]

export class SystematicDebugger {
  private hypotheses: DebugHypothesis[] = []

  generateHypotheses(evidence: Evidence, pastFindings: FindingRecord[]): DebugHypothesis[] {
    const pastText = pastFindings.map(f => f.text.toLowerCase()).join(" ")

    this.hypotheses = TEMPLATES
      .filter(t => !t.keywords.some(kw => pastText.includes(kw)))
      .map(t => ({
        id: `dbg-${crypto.createHash("sha256").update(t.cause).digest("hex").slice(0, 8)}`,
        cause: t.cause,
        likelihood: t.likelihood,
        testPlan: t.testPlan,
        status: "pending" as const,
        evidence: "",
      }))
      .sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.likelihood] - order[b.likelihood]
      })

    return this.hypotheses
  }

  getNextHypothesis(): DebugHypothesis | null {
    return this.hypotheses.find(h => h.status === "pending") ?? null
  }

  recordResult(id: string, status: "confirmed" | "eliminated", evidence: string): void {
    const h = this.hypotheses.find(h => h.id === id)
    if (h) {
      h.status = status
      h.evidence = evidence
    }
  }
}
