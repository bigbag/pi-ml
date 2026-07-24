import { describe, it, expect } from "vitest"
import { newId } from "../../src/util/ids.js"

describe("newId", () => {
  it("produces unique ids under burst", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId("fnd")))
    expect(ids.size).toBe(500)
  })

  it("uses prefix", () => {
    expect(newId("fnd").startsWith("fnd-")).toBe(true)
    expect(newId("lrn").startsWith("lrn-")).toBe(true)
    expect(newId("run").startsWith("run-")).toBe(true)
  })

  it("includes random suffix after time component", () => {
    const id = newId("fnd")
    const parts = id.split("-")
    expect(parts.length).toBeGreaterThanOrEqual(3)
    expect(parts[parts.length - 1].length).toBe(12)
  })
})
