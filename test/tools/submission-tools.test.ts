import { describe, it, expect, beforeEach, afterEach } from "vitest"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import { registerSubmissionTools } from "../../src/tools/submission-tools.js"

describe("submission_check", () => {
  let tmpDir: string
  const tools = new Map<string, any>()
  const mockPi = {
    registerTool(t: any) {
      tools.set(t.name, t)
    },
  } as any

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sub-check-"))
    tools.clear()
    registerSubmissionTools(mockPi)
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it("passes matching sample and submission", async () => {
    const sample = path.join(tmpDir, "sample.csv")
    const sub = path.join(tmpDir, "sub.csv")
    await fs.writeFile(sample, "id,target\n1,0.1\n2,0.2\n")
    await fs.writeFile(sub, "id,target\n1,0.5\n2,0.6\n")

    const tool = tools.get("submission_check")
    const result = await tool.execute("c1", {
      submissionPath: sub,
      samplePath: sample,
    })
    expect(result.details.ok).toBe(true)
  })

  it("fails on row count mismatch", async () => {
    const sample = path.join(tmpDir, "sample.csv")
    const sub = path.join(tmpDir, "sub.csv")
    await fs.writeFile(sample, "id,target\n1,0.1\n2,0.2\n")
    await fs.writeFile(sub, "id,target\n1,0.5\n")

    const tool = tools.get("submission_check")
    const result = await tool.execute("c1", {
      submissionPath: sub,
      samplePath: sample,
    })
    expect(result.details.ok).toBe(false)
    expect(result.content[0].text).toMatch(/row count/i)
  })

  it("fails on missing file", async () => {
    const tool = tools.get("submission_check")
    const result = await tool.execute("c1", {
      submissionPath: path.join(tmpDir, "nope.csv"),
    })
    expect(result.details.ok).toBe(false)
  })
})
