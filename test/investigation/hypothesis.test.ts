import { describe, it, expect } from "vitest"
import { generateHypothesisId, rankByExpectedValue } from "../../src/investigation/hypothesis.js"
import type { HypothesisRecord } from "../../src/types/hypothesis.js"

describe("generateHypothesisId", () => {
  it("returns a hyp- prefixed id", () => {
    const id = generateHypothesisId("some hypothesis text")
    expect(id).toMatch(/^hyp-[a-f0-9]{8}$/)
  })

  it("returns different ids for different texts", () => {
    const a = generateHypothesisId("hypothesis A")
    const b = generateHypothesisId("hypothesis B")
    expect(a).not.toBe(b)
  })
})

describe("rankByExpectedValue", () => {
  const makeHyp = (
    id: string,
    impact: "low" | "medium" | "high",
    status: "pending" | "testing" | "confirmed" | "rejected",
  ): HypothesisRecord => ({
    id,
    investigationId: "inv-001",
    text: id,
    rationale: "",
    status,
    expectedImpact: impact,
    experiments: [],
    outcome: "",
    timestamp: "",
  })

  it("sorts pending before non-pending", () => {
    const hyps = [
      makeHyp("a", "low", "testing"),
      makeHyp("b", "low", "pending"),
    ]
    const ranked = rankByExpectedValue(hyps)
    expect(ranked[0].id).toBe("b")
  })

  it("sorts high impact before low impact among pending", () => {
    const hyps = [
      makeHyp("a", "low", "pending"),
      makeHyp("b", "high", "pending"),
      makeHyp("c", "medium", "pending"),
    ]
    const ranked = rankByExpectedValue(hyps)
    expect(ranked[0].id).toBe("b")
    expect(ranked[1].id).toBe("c")
    expect(ranked[2].id).toBe("a")
  })

  it("handles empty array", () => {
    expect(rankByExpectedValue([])).toEqual([])
  })
})
