import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { KnowledgeStore } from "../../src/memory/knowledge.js"
import { seedPatterns } from "../../src/memory/seed-patterns.js"

describe("seedPatterns", () => {
  let dir: string
  let store: KnowledgeStore

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "seed-test-"))
    store = new KnowledgeStore(dir)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("seeds patterns into an empty store", async () => {
    const count = await seedPatterns(store)
    expect(count).toBeGreaterThanOrEqual(20)
    const all = await store.getAllPatterns()
    expect(all.length).toBe(count)
    expect(all[0].source).toBe("pre-seeded")
  })

  it("is idempotent — skips if patterns exist", async () => {
    const count1 = await seedPatterns(store)
    const count2 = await seedPatterns(store)
    expect(count1).toBeGreaterThan(0)
    expect(count2).toBe(0)
    const all = await store.getAllPatterns()
    expect(all.length).toBe(count1)
  })

  it("covers required categories", async () => {
    await seedPatterns(store)
    const all = await store.getAllPatterns()
    const categories = new Set(all.map(p => p.category))
    expect(categories).toContain("feature-engineering")
    expect(categories).toContain("model-selection")
    expect(categories).toContain("tuning")
    expect(categories).toContain("preprocessing")
    expect(categories).toContain("evaluation")
    expect(categories).toContain("data-quality")
  })

  it("every pattern has required fields", async () => {
    await seedPatterns(store)
    const all = await store.getAllPatterns()
    for (const p of all) {
      expect(p.id).toBeTruthy()
      expect(p.category).toBeTruthy()
      expect(p.technique).toBeTruthy()
      expect(p.whenToUse).toBeTruthy()
      expect(p.gotchas).toBeTruthy()
      expect(p.codeTemplate).toBeTruthy()
    }
  })
})
