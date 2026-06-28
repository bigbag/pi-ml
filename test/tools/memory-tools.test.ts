import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import { Journal } from "../../src/memory/journal.js"
import { KnowledgeStore } from "../../src/memory/knowledge.js"
import { registerMemoryTools } from "../../src/tools/memory-tools.js"
import { registerLeakageTools } from "../../src/tools/leakage-tools.js"
import { registerDiagnosticsTools } from "../../src/tools/diagnostics-tools.js"

describe("Memory, Leakage & Diagnostics Tools", () => {
  let tmpDir: string
  let journal: Journal
  let knowledge: KnowledgeStore
  const registeredTools: Map<string, any> = new Map()

  const mockPi = {
    registerTool(tool: any) {
      registeredTools.set(tool.name, tool)
    },
  } as any

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "mem-tools-"))
    journal = new Journal(path.join(tmpDir, "journal"))
    knowledge = new KnowledgeStore(path.join(tmpDir, "knowledge"))
    registeredTools.clear()
    registerMemoryTools(mockPi, () => journal, () => knowledge)
    registerLeakageTools(mockPi)
    registerDiagnosticsTools(mockPi)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it("registers all memory tools", () => {
    expect(registeredTools.has("journal_query")).toBe(true)
    expect(registeredTools.has("knowledge_search")).toBe(true)
    expect(registeredTools.has("finding_record")).toBe(true)
    expect(registeredTools.has("learning_save")).toBe(true)
  })

  it("registers leakage tools", () => {
    expect(registeredTools.has("leak_check")).toBe(true)
    expect(registeredTools.has("leak_preflight")).toBe(true)
  })

  it("registers diagnostics tools", () => {
    expect(registeredTools.has("diagnose")).toBe(true)
    expect(registeredTools.has("analyze_output")).toBe(true)
  })

  it("records and queries findings", async () => {
    const recordTool = registeredTools.get("finding_record")
    const queryTool = registeredTools.get("journal_query")
    const ctx = {}

    await recordTool.execute("c1", {
      investigationId: "inv-1",
      type: "insight",
      text: "Target encoding helps",
      tags: ["encoding"],
    }, null, null, ctx)

    const result = await queryTool.execute("c2", {
      type: "findings",
      investigationId: "inv-1",
    }, null, null, ctx)

    expect(result.details.count).toBe(1)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed[0].text).toBe("Target encoding helps")
  })

  it("saves and searches learnings", async () => {
    const saveTool = registeredTools.get("learning_save")
    const searchTool = registeredTools.get("knowledge_search")
    const ctx = {}

    await saveTool.execute("c1", {
      text: "LightGBM works well on this data",
      evidence: ["exp-1"],
      tags: ["lightgbm", "tabular"],
    }, null, null, ctx)

    const result = await searchTool.execute("c2", {
      tags: ["lightgbm"],
    }, null, null, ctx)

    expect(result.details.count).toBe(1)
  })

  it("runs leak preflight", async () => {
    const tool = registeredTools.get("leak_preflight")
    const result = await tool.execute("c1", {
      hasTimestamp: true,
      splitStrategy: "random",
    }, null, null, {})

    expect(result.details.passed).toBe(false)
    expect(result.details.warnings).toBeGreaterThan(0)
  })

  it("diagnoses overfitting", async () => {
    const tool = registeredTools.get("diagnose")
    const result = await tool.execute("c1", {
      trainMetrics: { accuracy: 0.99 },
      valMetrics: { accuracy: 0.70 },
    }, null, null, {})

    expect(result.content[0].text).toContain("overfitting")
    expect(result.details.failureType).toBe("overfitting")
  })

  it("analyzes training output", async () => {
    const tool = registeredTools.get("analyze_output")
    const result = await tool.execute("c1", {
      logText: "Epoch 1/5 - loss: 0.5432 - val_loss: 0.6123\nEpoch 2/5 - loss: 0.4321 - val_loss: 0.5890",
    }, null, null, {})

    expect(result.details.epochs).toBe(2)
    expect(result.details.hasNaN).toBe(false)
  })
})
