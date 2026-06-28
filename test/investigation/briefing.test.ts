import { describe, it, expect } from "vitest"
import { generateBriefing } from "../../src/investigation/briefing.js"
import type { Investigation } from "../../src/types/investigation.js"

function makeInvestigation(overrides: Partial<Investigation> = {}): Investigation {
  return {
    id: "inv-001",
    goal: "Predict house prices with RMSE < 0.12",
    status: "active",
    created: "2026-06-25T10:00:00Z",
    lastActivity: "2026-06-27T14:30:00Z",
    dataset: "housing.csv",
    problemType: "regression",
    currentBest: { metric: "rmse", value: 0.138, experimentId: "exp-007" },
    constraints: ["< 1s inference"],
    notes: [],
    openQuestions: [
      { text: "Is location leaking?", priority: "high", addedAt: "2026-06-26" },
    ],
    hypotheses: [
      {
        id: "hyp-001", investigationId: "inv-001", text: "LightGBM baseline",
        rationale: "", status: "confirmed", expectedImpact: "high",
        experiments: ["exp-001"], outcome: "RMSE 0.15", timestamp: "",
      },
      {
        id: "hyp-002", investigationId: "inv-001", text: "Target encoding",
        rationale: "", status: "pending", expectedImpact: "medium",
        experiments: [], outcome: "", timestamp: "",
      },
    ],
    experiments: [
      {
        id: "exp-001", investigationId: "inv-001", hypothesisId: "hyp-001",
        timestamp: "", config: { model: "lightgbm", features: [], params: {} },
        metrics: { rmse: 0.15 }, duration: 30, outcome: "improvement", notes: "",
      },
    ],
    findings: [
      {
        id: "fnd-001", investigationId: "inv-001", type: "insight",
        text: "Location has 500+ categories", sourceExperiments: [],
        tags: [], timestamp: "",
      },
    ],
    ...overrides,
  }
}

describe("generateBriefing", () => {
  it("includes the goal", () => {
    const briefing = generateBriefing(makeInvestigation())
    expect(briefing).toContain("Predict house prices")
  })

  it("includes current best metric", () => {
    const briefing = generateBriefing(makeInvestigation())
    expect(briefing).toContain("0.138")
    expect(briefing).toContain("rmse")
  })

  it("includes hypothesis counts", () => {
    const briefing = generateBriefing(makeInvestigation())
    expect(briefing).toContain("1 confirmed")
    expect(briefing).toContain("1 pending")
  })

  it("includes open questions", () => {
    const briefing = generateBriefing(makeInvestigation())
    expect(briefing).toContain("Is location leaking?")
  })

  it("includes experiment count", () => {
    const briefing = generateBriefing(makeInvestigation())
    expect(briefing).toContain("1 experiment")
  })

  it("handles investigation with no data gracefully", () => {
    const briefing = generateBriefing(makeInvestigation({
      currentBest: null,
      hypotheses: [],
      experiments: [],
      findings: [],
      openQuestions: [],
    }))
    expect(briefing).toContain("Predict house prices")
    expect(briefing).toContain("No experiments")
  })
})
