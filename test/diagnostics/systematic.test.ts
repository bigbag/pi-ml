import { describe, it, expect } from "vitest"
import { SystematicDebugger } from "../../src/diagnostics/systematic.js"
import type { Evidence } from "../../src/diagnostics/classifier.js"
import type { FindingRecord } from "../../src/types/journal.js"

describe("SystematicDebugger", () => {
  const evidence: Evidence = {
    trainMetrics: { accuracy: 0.55, loss: 0.9 },
    valMetrics: { accuracy: 0.52, loss: 0.95 },
    testMetrics: null,
    lossHistory: [1.0, 0.95, 0.92, 0.9],
    classDistribution: null,
  }

  it("generates hypotheses from evidence", () => {
    const debugger_ = new SystematicDebugger()
    const hypotheses = debugger_.generateHypotheses(evidence, [])
    expect(hypotheses.length).toBeGreaterThan(0)
    for (const h of hypotheses) {
      expect(h.id).toBeTruthy()
      expect(h.cause).toBeTruthy()
      expect(h.testPlan).toBeTruthy()
      expect(h.status).toBe("pending")
    }
  })

  it("ranks hypotheses by likelihood", () => {
    const debugger_ = new SystematicDebugger()
    const hypotheses = debugger_.generateHypotheses(evidence, [])
    const likelihoodOrder = { high: 0, medium: 1, low: 2 }
    for (let i = 1; i < hypotheses.length; i++) {
      expect(likelihoodOrder[hypotheses[i].likelihood]).toBeGreaterThanOrEqual(
        likelihoodOrder[hypotheses[i - 1].likelihood],
      )
    }
  })

  it("gets next pending hypothesis", () => {
    const debugger_ = new SystematicDebugger()
    debugger_.generateHypotheses(evidence, [])
    const next = debugger_.getNextHypothesis()
    expect(next).toBeDefined()
    expect(next!.status).toBe("pending")
  })

  it("records result and updates status", () => {
    const debugger_ = new SystematicDebugger()
    const hypotheses = debugger_.generateHypotheses(evidence, [])
    const first = hypotheses[0]
    debugger_.recordResult(first.id, "confirmed", "Found the issue")
    expect(first.status).toBe("confirmed")
    expect(first.evidence).toBe("Found the issue")
  })

  it("skips hypotheses matching past findings", () => {
    const pastFindings: FindingRecord[] = [
      {
        id: "fnd-1",
        investigationId: "inv-1",
        type: "insight",
        text: "Model capacity insufficient",
        sourceExperiments: [],
        tags: ["capacity"],
        timestamp: "",
      },
    ]
    const debugger_ = new SystematicDebugger()
    const withFindings = debugger_.generateHypotheses(evidence, pastFindings)
    const debugger2 = new SystematicDebugger()
    const without = debugger2.generateHypotheses(evidence, [])
    expect(withFindings.length).toBeLessThanOrEqual(without.length)
  })

  it("returns null when no pending hypotheses remain", () => {
    const debugger_ = new SystematicDebugger()
    const hypotheses = debugger_.generateHypotheses(evidence, [])
    for (const h of hypotheses) {
      debugger_.recordResult(h.id, "eliminated", "not the cause")
    }
    expect(debugger_.getNextHypothesis()).toBeNull()
  })
})
