import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { Journal } from "../../src/memory/journal.js"

describe("Journal", () => {
  let dir: string
  let journal: Journal

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "journal-test-"))
    journal = new Journal(dir)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("records and retrieves experiments", async () => {
    const exp = {
      id: "exp-001",
      investigationId: "inv-001",
      hypothesisId: "hyp-001",
      timestamp: "2026-06-28T10:00:00Z",
      config: { model: "lightgbm", features: ["f1"], params: {} },
      metrics: { rmse: 0.12 },
      duration: 30,
      outcome: "improvement" as const,
      notes: "first run",
    }
    await journal.recordExperiment(exp)
    const experiments = await journal.getExperiments()
    expect(experiments).toHaveLength(1)
    expect(experiments[0].id).toBe("exp-001")
  })

  it("records and retrieves hypotheses", async () => {
    const hyp = {
      id: "hyp-001",
      investigationId: "inv-001",
      text: "LightGBM will beat baseline",
      rationale: "Strong on tabular data",
      status: "pending" as const,
      expectedImpact: "high" as const,
      experiments: [],
      outcome: "",
      timestamp: "2026-06-28T10:00:00Z",
    }
    await journal.recordHypothesis(hyp)
    const hyps = await journal.getHypotheses({ investigationId: "inv-001" })
    expect(hyps).toHaveLength(1)
    expect(hyps[0].status).toBe("pending")
  })

  it("records and retrieves findings", async () => {
    const finding = {
      id: "fnd-001",
      investigationId: "inv-001",
      type: "insight" as const,
      text: "Target encoding helps for high-cardinality",
      sourceExperiments: ["exp-001"],
      tags: ["encoding"],
      timestamp: "2026-06-28T10:00:00Z",
    }
    await journal.recordFinding(finding)
    const findings = await journal.getFindings({ tags: ["encoding"] })
    expect(findings).toHaveLength(1)
  })

  it("updates hypothesis status", async () => {
    await journal.recordHypothesis({
      id: "hyp-001",
      investigationId: "inv-001",
      text: "test",
      rationale: "",
      status: "pending",
      expectedImpact: "medium",
      experiments: [],
      outcome: "",
      timestamp: "2026-06-28T10:00:00Z",
    })
    await journal.updateHypothesis("hyp-001", {
      status: "confirmed",
      outcome: "RMSE improved by 0.02",
    })
    const hyps = await journal.getHypotheses()
    expect(hyps[0].status).toBe("confirmed")
  })

  it("filters experiments by investigation", async () => {
    await journal.recordExperiment({
      id: "exp-001", investigationId: "inv-001", hypothesisId: "hyp-001",
      timestamp: "", config: { model: "lgbm", features: [], params: {} },
      metrics: { rmse: 0.1 }, duration: 10, outcome: "improvement", notes: "",
    })
    await journal.recordExperiment({
      id: "exp-002", investigationId: "inv-002", hypothesisId: "hyp-002",
      timestamp: "", config: { model: "xgb", features: [], params: {} },
      metrics: { rmse: 0.2 }, duration: 10, outcome: "neutral", notes: "",
    })
    const exps = await journal.getExperiments({ investigationId: "inv-001" })
    expect(exps).toHaveLength(1)
    expect(exps[0].id).toBe("exp-001")
  })

  it("gets top experiments by metric", async () => {
    await journal.recordExperiment({
      id: "exp-001", investigationId: "inv-001", hypothesisId: "h1",
      timestamp: "", config: { model: "a", features: [], params: {} },
      metrics: { rmse: 0.15 }, duration: 10, outcome: "neutral", notes: "",
    })
    await journal.recordExperiment({
      id: "exp-002", investigationId: "inv-001", hypothesisId: "h2",
      timestamp: "", config: { model: "b", features: [], params: {} },
      metrics: { rmse: 0.10 }, duration: 10, outcome: "improvement", notes: "",
    })
    const top = await journal.topExperiments("rmse", "asc", 1)
    expect(top).toHaveLength(1)
    expect(top[0].id).toBe("exp-002")
  })
})
