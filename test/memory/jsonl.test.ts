import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtemp, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { JsonlStore } from "../../src/memory/jsonl.js"

interface TestRecord {
  id: string
  name: string
  value: number
}

describe("JsonlStore", () => {
  let dir: string
  let store: JsonlStore<TestRecord>

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "jsonl-test-"))
    store = new JsonlStore<TestRecord>(join(dir, "test.jsonl"))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it("appends and reads records", async () => {
    await store.append({ id: "1", name: "a", value: 10 })
    await store.append({ id: "2", name: "b", value: 20 })
    const records = await store.readAll()
    expect(records).toHaveLength(2)
    expect(records[0].id).toBe("1")
    expect(records[1].id).toBe("2")
  })

  it("returns empty array for missing file", async () => {
    const records = await store.readAll()
    expect(records).toEqual([])
  })

  it("finds record by predicate", async () => {
    await store.append({ id: "1", name: "a", value: 10 })
    await store.append({ id: "2", name: "b", value: 20 })
    const found = await store.find(r => r.id === "2")
    expect(found?.name).toBe("b")
  })

  it("filters records", async () => {
    await store.append({ id: "1", name: "a", value: 10 })
    await store.append({ id: "2", name: "b", value: 20 })
    await store.append({ id: "3", name: "a", value: 30 })
    const filtered = await store.filter(r => r.name === "a")
    expect(filtered).toHaveLength(2)
  })

  it("updates record by predicate", async () => {
    await store.append({ id: "1", name: "a", value: 10 })
    await store.append({ id: "2", name: "b", value: 20 })
    await store.update(r => r.id === "1", { value: 99 })
    const records = await store.readAll()
    expect(records[0].value).toBe(99)
    expect(records[1].value).toBe(20)
  })

  it("removes record by predicate", async () => {
    await store.append({ id: "1", name: "a", value: 10 })
    await store.append({ id: "2", name: "b", value: 20 })
    await store.remove(r => r.id === "1")
    const records = await store.readAll()
    expect(records).toHaveLength(1)
    expect(records[0].id).toBe("2")
  })

  it("skips corrupt lines on readAll", async () => {
    const { writeFile } = await import("node:fs/promises")
    const file = join(dir, "corrupt.jsonl")
    await writeFile(
      file,
      '{"id":"1","name":"a","value":1}\n' +
        "NOT_JSON\n" +
        '{"id":"2","name":"b","value":2}\n',
    )
    const s = new JsonlStore<TestRecord>(file)
    const records = await s.readAll()
    expect(records).toHaveLength(2)
    expect(records.map((r) => r.id)).toEqual(["1", "2"])
  })

  it("update is safe under concurrency", async () => {
    await store.append({ id: "1", name: "a", value: 0 })
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.append({ id: String(i + 2), name: "x", value: i }),
      ),
    )
    const all = await store.readAll()
    expect(all.length).toBe(21)
  })
})
