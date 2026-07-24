import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { InvestigationManager } from "../../src/investigation/manager.js"
import { Journal } from "../../src/memory/journal.js"

describe("InvestigationManager", () => {
  let dir: string
  let manager: InvestigationManager
  let journal: Journal

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "inv-test-"))
    journal = new Journal(join(dir, "journal"))
    manager = new InvestigationManager(join(dir, "investigations"), journal)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("creates an investigation and returns an id", async () => {
    const id = await manager.create("Predict house prices", "housing.csv", "regression")
    expect(id).toMatch(/^inv-/)
  })

  it("loads an investigation with empty journal arrays", async () => {
    const id = await manager.create("Test goal", "data.csv", "classification")
    const inv = await manager.load(id)
    expect(inv.goal).toBe("Test goal")
    expect(inv.dataset).toBe("data.csv")
    expect(inv.problemType).toBe("classification")
    expect(inv.status).toBe("active")
    expect(inv.hypotheses).toEqual([])
    expect(inv.experiments).toEqual([])
    expect(inv.findings).toEqual([])
  })

  it("assembles investigation with journal records", async () => {
    const id = await manager.create("Goal", "d.csv", "regression")
    await journal.recordHypothesis({
      id: "hyp-001",
      investigationId: id,
      text: "LightGBM baseline",
      rationale: "Good default",
      status: "pending",
      expectedImpact: "high",
      experiments: [],
      outcome: "",
      timestamp: new Date().toISOString(),
    })
    await journal.recordExperiment({
      id: "exp-001",
      investigationId: id,
      hypothesisId: "hyp-001",
      timestamp: new Date().toISOString(),
      config: { model: "lightgbm", features: ["f1"], params: {} },
      metrics: { rmse: 0.15 },
      duration: 30,
      outcome: "improvement",
      notes: "",
    })
    const inv = await manager.load(id)
    expect(inv.hypotheses).toHaveLength(1)
    expect(inv.experiments).toHaveLength(1)
  })

  it("merges ExperimentStore into load", async () => {
    const { ExperimentStore } = await import("../../src/store/experiment-store.js")
    const store = new ExperimentStore(join(dir, "experiments.jsonl"))
    manager = new InvestigationManager(join(dir, "investigations"), journal, store)
    const id = await manager.create("Goal store", "d.csv", "regression")
    await store.create({
      id: "exp-store",
      name: "from-store",
      investigationId: id,
      status: "completed",
      results: { auc: 0.9 },
    })
    const inv = await manager.load(id)
    expect(inv.experiments.some((e) => e.id === "exp-store")).toBe(true)
    expect(inv.experiments.find((e) => e.id === "exp-store")!.metrics.auc).toBe(0.9)
  })

  it("findByIdOrGoal matches goal substring", async () => {
    const id = await manager.create("Predict house prices in Austin", "h.csv", "regression")
    const hit = await manager.findByIdOrGoal("house prices")
    expect(hit?.id).toBe(id)
  })

  it("lists all investigations", async () => {
    await manager.create("Goal A", "a.csv", "regression")
    await manager.create("Goal B", "b.csv", "classification")
    const list = await manager.list()
    expect(list).toHaveLength(2)
  })

  it("create pauses prior active investigations", async () => {
    const a = await manager.create("Goal A", "a.csv", "regression")
    const b = await manager.create("Goal B", "b.csv", "classification")
    expect((await manager.load(a)).status).toBe("paused")
    expect((await manager.load(b)).status).toBe("active")
    expect(await manager.getActiveId()).toBe(b)
  })

  it("resume pauses other actives", async () => {
    const a = await manager.create("Goal A", "a.csv", "regression")
    const b = await manager.create("Goal B", "b.csv", "classification")
    await manager.resume(a)
    expect((await manager.load(a)).status).toBe("active")
    expect((await manager.load(b)).status).toBe("paused")
  })

  it("pauses an investigation", async () => {
    const id = await manager.create("Goal", "d.csv", "regression")
    await manager.pause(id)
    const inv = await manager.load(id)
    expect(inv.status).toBe("paused")
  })

  it("resumes a paused investigation", async () => {
    const id = await manager.create("Goal", "d.csv", "regression")
    await manager.pause(id)
    await manager.resume(id)
    const inv = await manager.load(id)
    expect(inv.status).toBe("active")
  })

  it("closes an investigation", async () => {
    const id = await manager.create("Goal", "d.csv", "regression")
    await manager.close(id)
    const inv = await manager.load(id)
    expect(inv.status).toBe("closed")
  })

  it("updates context fields", async () => {
    const id = await manager.create("Goal", "d.csv", "regression")
    await manager.updateContext(id, {
      currentBest: { metric: "rmse", value: 0.12, experimentId: "exp-001" },
    })
    const inv = await manager.load(id)
    expect(inv.currentBest).toEqual({ metric: "rmse", value: 0.12, experimentId: "exp-001" })
  })

  it("adds open questions", async () => {
    const id = await manager.create("Goal", "d.csv", "regression")
    await manager.addQuestion(id, { text: "Is location leaking?", priority: "high", addedAt: "2026-06-28" })
    const inv = await manager.load(id)
    expect(inv.openQuestions).toHaveLength(1)
    expect(inv.openQuestions[0].text).toBe("Is location leaking?")
  })

  it("creates with optional constraints", async () => {
    const id = await manager.create("Goal", "d.csv", "regression", ["< 1s inference"])
    const inv = await manager.load(id)
    expect(inv.constraints).toEqual(["< 1s inference"])
  })
})
