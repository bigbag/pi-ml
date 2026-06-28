import { describe, it, expect } from "vitest"
import { classifyFailure } from "../../src/diagnostics/classifier.js"
import type { Evidence } from "../../src/diagnostics/classifier.js"

describe("classifyFailure", () => {
  it("detects overfitting when train >> val", () => {
    const evidence: Evidence = {
      trainMetrics: { accuracy: 0.99, loss: 0.01 },
      valMetrics: { accuracy: 0.72, loss: 0.85 },
      testMetrics: null,
      lossHistory: [0.5, 0.3, 0.1, 0.01],
      classDistribution: null,
    }
    expect(classifyFailure(evidence)).toBe("overfitting")
  })

  it("detects underfitting when train metric is poor", () => {
    const evidence: Evidence = {
      trainMetrics: { accuracy: 0.55, loss: 0.9 },
      valMetrics: { accuracy: 0.52, loss: 0.95 },
      testMetrics: null,
      lossHistory: [1.0, 0.95, 0.92, 0.9],
      classDistribution: null,
    }
    expect(classifyFailure(evidence)).toBe("underfitting")
  })

  it("detects instability when loss has NaN", () => {
    const evidence: Evidence = {
      trainMetrics: { loss: NaN },
      valMetrics: null,
      testMetrics: null,
      lossHistory: [0.5, 0.3, NaN],
      classDistribution: null,
    }
    expect(classifyFailure(evidence)).toBe("instability")
  })

  it("detects generalization when val ok but test bad", () => {
    const evidence: Evidence = {
      trainMetrics: { accuracy: 0.92 },
      valMetrics: { accuracy: 0.90 },
      testMetrics: { accuracy: 0.65 },
      lossHistory: [],
      classDistribution: null,
    }
    expect(classifyFailure(evidence)).toBe("generalization")
  })

  it("detects imbalance when high accuracy but bad recall", () => {
    const evidence: Evidence = {
      trainMetrics: { accuracy: 0.95, recall: 0.15 },
      valMetrics: { accuracy: 0.94, recall: 0.12 },
      testMetrics: null,
      lossHistory: [],
      classDistribution: { 0: 950, 1: 50 },
    }
    expect(classifyFailure(evidence)).toBe("imbalance")
  })

  it("detects slow convergence", () => {
    const evidence: Evidence = {
      trainMetrics: { loss: 0.7 },
      valMetrics: { loss: 0.72 },
      testMetrics: null,
      lossHistory: [0.8, 0.79, 0.78, 0.77, 0.76, 0.75, 0.74, 0.73, 0.72, 0.71, 0.7],
      classDistribution: null,
    }
    expect(classifyFailure(evidence)).toBe("convergence")
  })

  it("returns unknown when nothing matches", () => {
    const evidence: Evidence = {
      trainMetrics: { accuracy: 0.85 },
      valMetrics: { accuracy: 0.83 },
      testMetrics: { accuracy: 0.82 },
      lossHistory: [0.5, 0.3, 0.2, 0.15],
      classDistribution: null,
    }
    expect(classifyFailure(evidence)).toBe("unknown")
  })
})
