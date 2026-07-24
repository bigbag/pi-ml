import { describe, it, expect } from "vitest"
import { withFileLock } from "../../src/util/file-lock.js"
import { mkdtemp, writeFile, readFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

describe("withFileLock", () => {
  it("serializes concurrent writers", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pilock-"))
    const target = join(dir, "data.jsonl")
    await writeFile(target, "")
    const lockPath = target + ".lock"
    const N = 20
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        withFileLock(lockPath, async () => {
          const cur = await readFile(target, "utf-8")
          await writeFile(target, cur + `line-${i}\n`)
        }),
      ),
    )
    const lines = (await readFile(target, "utf-8")).trim().split("\n")
    expect(lines).toHaveLength(N)
  })

  it("throws when lock cannot be acquired", async () => {
    const dir = await mkdtemp(join(tmpdir(), "pilock-fail-"))
    const lockPath = join(dir, "busy.lock")
    // Hold lock: acquire first, then race a short-retry contender
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    const holder = withFileLock(lockPath, async () => {
      release()
      await new Promise((r) => setTimeout(r, 300))
      return "held"
    })
    await gate
    await expect(
      withFileLock(lockPath, async () => "should-fail", { retries: 3, delayMs: 10 }),
    ).rejects.toThrow(/Could not acquire lock/)
    await holder
  })
})
