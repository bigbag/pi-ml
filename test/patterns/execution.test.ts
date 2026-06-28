import { describe, it, expect } from "vitest"
import { AutoLoopPattern } from "../../src/patterns/auto-loop.js"
import { GuidedPattern } from "../../src/patterns/guided.js"
import type { HypothesisRecord } from "../../src/types/hypothesis.js"

function makeHyp(
  id: string,
  impact: "low" | "medium" | "high",
  status: "pending" | "testing" | "confirmed" | "rejected" = "pending",
): HypothesisRecord {
  return {
    id,
    investigationId: "inv-001",
    text: id,
    rationale: "",
    status,
    expectedImpact: impact,
    experiments: [],
    outcome: "",
    timestamp: "",
  }
}

describe("AutoLoopPattern", () => {
  it("should continue when budget remains", () => {
    const loop = new AutoLoopPattern({ maxExperiments: 5 })
    expect(loop.shouldContinue({ experimentsRun: 2, improvements: [1, 2] })).toBe(true)
  })

  it("should stop when budget exhausted", () => {
    const loop = new AutoLoopPattern({ maxExperiments: 5 })
    expect(loop.shouldContinue({ experimentsRun: 5, improvements: [1] })).toBe(false)
  })

  it("should stop when metric target reached", () => {
    const loop = new AutoLoopPattern({
      maxExperiments: 100,
      metricTarget: { metric: "rmse", target: 0.1, direction: "below" },
    })
    expect(loop.shouldContinue({
      experimentsRun: 2,
      improvements: [],
      currentMetricValue: 0.08,
    })).toBe(false)
  })

  it("should continue when metric not yet reached", () => {
    const loop = new AutoLoopPattern({
      maxExperiments: 100,
      metricTarget: { metric: "rmse", target: 0.1, direction: "below" },
    })
    expect(loop.shouldContinue({
      experimentsRun: 2,
      improvements: [],
      currentMetricValue: 0.15,
    })).toBe(true)
  })

  it("should detect plateau", () => {
    const loop = new AutoLoopPattern({ maxExperiments: 100, plateauRounds: 3 })
    expect(loop.shouldContinue({
      experimentsRun: 5,
      improvements: [],
      roundsSinceImprovement: 3,
    })).toBe(false)
  })

  it("selects highest-ranked pending hypothesis", () => {
    const loop = new AutoLoopPattern({ maxExperiments: 10 })
    const hyps = [
      makeHyp("a", "low"),
      makeHyp("b", "high"),
      makeHyp("c", "medium"),
      makeHyp("d", "high", "confirmed"),
    ]
    const next = loop.selectNextHypothesis(hyps)
    expect(next?.id).toBe("b")
  })

  it("returns null when no pending hypotheses", () => {
    const loop = new AutoLoopPattern({ maxExperiments: 10 })
    const hyps = [makeHyp("a", "high", "confirmed")]
    expect(loop.selectNextHypothesis(hyps)).toBeNull()
  })
})

describe("GuidedPattern", () => {
  it("proposes pending hypotheses ranked by impact", () => {
    const guided = new GuidedPattern()
    const hyps = [
      makeHyp("a", "low"),
      makeHyp("b", "high"),
      makeHyp("c", "medium"),
    ]
    const suggestions = guided.proposeNextSteps(hyps)
    expect(suggestions).toHaveLength(3)
    expect(suggestions[0].id).toBe("b")
  })

  it("filters out non-pending hypotheses", () => {
    const guided = new GuidedPattern()
    const hyps = [
      makeHyp("a", "high", "confirmed"),
      makeHyp("b", "low"),
    ]
    const suggestions = guided.proposeNextSteps(hyps)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].id).toBe("b")
  })
})
