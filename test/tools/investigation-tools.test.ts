import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import { InvestigationManager } from "../../src/investigation/manager.js"
import { Journal } from "../../src/memory/journal.js"
import { registerInvestigationTools } from "../../src/tools/investigation-tools.js"
import { registerHypothesisTools } from "../../src/tools/hypothesis-tools.js"

describe("Investigation & Hypothesis Tools", () => {
  let tmpDir: string
  let manager: InvestigationManager
  let journal: Journal
  const registeredTools: Map<string, any> = new Map()

  const mockPi = {
    registerTool(tool: any) {
      registeredTools.set(tool.name, tool)
    },
  } as any

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "inv-tools-"))
    journal = new Journal(path.join(tmpDir, "journal"))
    manager = new InvestigationManager(path.join(tmpDir, "investigations"), journal)
    registeredTools.clear()
    registerInvestigationTools(mockPi, () => manager, () => journal)
    registerHypothesisTools(mockPi, () => journal)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it("registers all investigation tools", () => {
    expect(registeredTools.has("investigation_create")).toBe(true)
    expect(registeredTools.has("investigation_resume")).toBe(true)
    expect(registeredTools.has("investigation_status")).toBe(true)
    expect(registeredTools.has("investigation_pause")).toBe(true)
    expect(registeredTools.has("investigation_close")).toBe(true)
  })

  it("registers all hypothesis tools", () => {
    expect(registeredTools.has("hypothesis_add")).toBe(true)
    expect(registeredTools.has("hypothesis_rank")).toBe(true)
    expect(registeredTools.has("hypothesis_update")).toBe(true)
  })

  it("creates an investigation via tool", async () => {
    const tool = registeredTools.get("investigation_create")
    const ctx = {}
    const result = await tool.execute("call1", {
      goal: "Predict prices",
      dataset: "housing.csv",
      problemType: "regression",
    }, null, null, ctx)
    expect(result.content[0].text).toContain("Investigation")
    expect(result.details.id).toMatch(/^inv-/)
  })

  it("creates and pauses investigation", async () => {
    const createTool = registeredTools.get("investigation_create")
    const pauseTool = registeredTools.get("investigation_pause")
    const ctx = {}

    const created = await createTool.execute("c1", {
      goal: "Test", dataset: "test.csv", problemType: "classification",
    }, null, null, ctx)

    const id = created.details.id
    await pauseTool.execute("c2", { id }, null, null, ctx)

    const investigations = await manager.list()
    const inv = investigations.find(i => i.id === id)
    expect(inv!.status).toBe("paused")
  })

  it("adds and ranks hypotheses", async () => {
    const addTool = registeredTools.get("hypothesis_add")
    const rankTool = registeredTools.get("hypothesis_rank")
    const ctx = {}

    await addTool.execute("c1", {
      investigationId: "inv-test",
      text: "Low impact idea",
      rationale: "Just trying",
      expectedImpact: "low",
    }, null, null, ctx)

    await addTool.execute("c2", {
      investigationId: "inv-test",
      text: "High impact idea",
      rationale: "Strong signal",
      expectedImpact: "high",
    }, null, null, ctx)

    const ranked = await rankTool.execute("c3", {
      investigationId: "inv-test",
    }, null, null, ctx)

    expect(ranked.content[0].text).toMatch(/1\. .*high.*High impact/s)
  })

  it("updates hypothesis status", async () => {
    const addTool = registeredTools.get("hypothesis_add")
    const updateTool = registeredTools.get("hypothesis_update")
    const ctx = {}

    const added = await addTool.execute("c1", {
      investigationId: "inv-test",
      text: "Test hypothesis",
      rationale: "Testing",
      expectedImpact: "medium",
    }, null, null, ctx)

    const hypId = added.details.id
    await updateTool.execute("c2", {
      id: hypId,
      status: "confirmed",
      outcome: "Improved RMSE by 0.02",
    }, null, null, ctx)

    const hyps = await journal.getHypotheses()
    expect(hyps[0].status).toBe("confirmed")
    expect(hyps[0].outcome).toBe("Improved RMSE by 0.02")
  })
})
