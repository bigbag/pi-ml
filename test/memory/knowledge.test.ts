import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { KnowledgeStore } from "../../src/memory/knowledge.js"

describe("KnowledgeStore", () => {
  let dir: string
  let store: KnowledgeStore

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "knowledge-test-"))
    store = new KnowledgeStore(dir)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("adds and retrieves patterns", async () => {
    await store.addPattern({
      id: "pat-001",
      category: "feature-engineering",
      problemType: "tabular-regression",
      technique: "target-encoding",
      whenToUse: "High-cardinality categoricals",
      gotchas: "Must use fold-based encoding",
      codeTemplate: "from category_encoders import TargetEncoder",
      source: "pre-seeded",
    })
    const patterns = await store.searchPatterns({})
    expect(patterns).toHaveLength(1)
    expect(patterns[0].technique).toBe("target-encoding")
  })

  it("filters patterns by category and problem type", async () => {
    await store.addPattern({
      id: "pat-001", category: "feature-engineering", problemType: "tabular-regression",
      technique: "target-encoding", whenToUse: "", gotchas: "", codeTemplate: "", source: "pre-seeded",
    })
    await store.addPattern({
      id: "pat-002", category: "model-selection", problemType: "tabular-regression",
      technique: "lightgbm", whenToUse: "", gotchas: "", codeTemplate: "", source: "pre-seeded",
    })
    await store.addPattern({
      id: "pat-003", category: "feature-engineering", problemType: "nlp",
      technique: "tfidf", whenToUse: "", gotchas: "", codeTemplate: "", source: "pre-seeded",
    })
    const fe = await store.searchPatterns({ category: "feature-engineering" })
    expect(fe).toHaveLength(2)
    const feTabular = await store.searchPatterns({
      category: "feature-engineering",
      problemType: "tabular-regression",
    })
    expect(feTabular).toHaveLength(1)
    expect(feTabular[0].id).toBe("pat-001")
  })

  it("adds and searches learnings by tags", async () => {
    await store.addLearning({
      id: "lrn-001",
      text: "Target encoding works well here",
      evidence: ["exp-001"],
      tags: ["encoding", "tabular"],
      source: "learned",
      timestamp: "2026-06-28T10:00:00Z",
    })
    await store.addLearning({
      id: "lrn-002",
      text: "LightGBM beats XGBoost on this data",
      evidence: ["exp-002"],
      tags: ["model-selection", "tabular"],
      source: "learned",
      timestamp: "2026-06-28T11:00:00Z",
    })
    const encodingResults = await store.searchLearnings(["encoding"])
    expect(encodingResults).toHaveLength(1)
    expect(encodingResults[0].id).toBe("lrn-001")

    const tabularResults = await store.searchLearnings(["tabular"])
    expect(tabularResults).toHaveLength(2)
  })

  it("gets patterns by problem type", async () => {
    await store.addPattern({
      id: "pat-001", category: "tuning", problemType: "tabular-classification",
      technique: "optuna", whenToUse: "", gotchas: "", codeTemplate: "", source: "pre-seeded",
    })
    const results = await store.getPatternsByProblemType("tabular-classification")
    expect(results).toHaveLength(1)
    expect(results[0].technique).toBe("optuna")
  })
})
