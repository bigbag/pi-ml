import { describe, it, expect } from "vitest"
import { topBy, matchesFilter, groupBy, byTags } from "../../src/memory/queries.js"

interface TestItem {
  id: string
  name: string
  value: number
  tags: string[]
  nested: { score: number }
}

const items: TestItem[] = [
  { id: "1", name: "a", value: 10, tags: ["x", "y"], nested: { score: 0.9 } },
  { id: "2", name: "b", value: 20, tags: ["y", "z"], nested: { score: 0.7 } },
  { id: "3", name: "a", value: 30, tags: ["x"], nested: { score: 0.8 } },
  { id: "4", name: "c", value: 5, tags: ["z"], nested: { score: 0.95 } },
]

describe("topBy", () => {
  it("sorts ascending and limits", () => {
    const result = topBy(items, "value", "asc", 2)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe("4")
    expect(result[1].id).toBe("1")
  })

  it("sorts descending", () => {
    const result = topBy(items, "value", "desc", 2)
    expect(result[0].id).toBe("3")
    expect(result[1].id).toBe("2")
  })
})

describe("matchesFilter", () => {
  it("matches flat properties", () => {
    expect(matchesFilter(items[0], { name: "a" })).toBe(true)
    expect(matchesFilter(items[0], { name: "b" })).toBe(false)
  })

  it("matches nested properties", () => {
    expect(matchesFilter(items[0], { nested: { score: 0.9 } })).toBe(true)
    expect(matchesFilter(items[0], { nested: { score: 0.5 } })).toBe(false)
  })

  it("matches with empty filter", () => {
    expect(matchesFilter(items[0], {})).toBe(true)
  })
})

describe("groupBy", () => {
  it("groups and aggregates", () => {
    const result = groupBy(items, "name", {
      value: "min",
      count: "count",
    })
    expect(result["a"].value).toBe(10)
    expect(result["a"].count).toBe(2)
    expect(result["b"].value).toBe(20)
    expect(result["c"].count).toBe(1)
  })
})

describe("byTags", () => {
  it("filters records matching any tag", () => {
    const result = byTags(items, ["x"])
    expect(result).toHaveLength(2)
  })

  it("filters records matching multiple tags", () => {
    const result = byTags(items, ["x", "z"])
    expect(result).toHaveLength(4)
  })

  it("returns empty for no matches", () => {
    const result = byTags(items, ["nonexistent"])
    expect(result).toHaveLength(0)
  })
})
