import { describe, it, expect } from "vitest"
import { DoomLoopDetector } from "../../src/patterns/doom-loop.js"

describe("DoomLoopDetector", () => {
  it("returns null when no loop", () => {
    const d = new DoomLoopDetector()
    d.record({ name: "tool_a", args: { x: 1 } })
    d.record({ name: "tool_b", args: { x: 2 } })
    expect(d.detect()).toBeNull()
  })

  it("detects 3 identical consecutive calls", () => {
    const d = new DoomLoopDetector()
    d.record({ name: "search", args: { q: "lightgbm" } })
    d.record({ name: "search", args: { q: "lightgbm" } })
    d.record({ name: "search", args: { q: "lightgbm" } })
    const result = d.detect()
    expect(result).not.toBeNull()
    expect(result).toContain("consecutive")
  })

  it("does not trigger for 2 identical calls", () => {
    const d = new DoomLoopDetector()
    d.record({ name: "search", args: { q: "lightgbm" } })
    d.record({ name: "search", args: { q: "lightgbm" } })
    expect(d.detect()).toBeNull()
  })

  it("detects repeating sequence of length 2", () => {
    const d = new DoomLoopDetector()
    d.record({ name: "a", args: {} })
    d.record({ name: "b", args: {} })
    d.record({ name: "a", args: {} })
    d.record({ name: "b", args: {} })
    const result = d.detect()
    expect(result).not.toBeNull()
    expect(result).toContain("repeating")
  })

  it("distinguishes different args", () => {
    const d = new DoomLoopDetector()
    d.record({ name: "search", args: { q: "a" } })
    d.record({ name: "search", args: { q: "b" } })
    d.record({ name: "search", args: { q: "c" } })
    expect(d.detect()).toBeNull()
  })

  it("resets history", () => {
    const d = new DoomLoopDetector()
    d.record({ name: "a", args: {} })
    d.record({ name: "a", args: {} })
    d.record({ name: "a", args: {} })
    expect(d.detect()).not.toBeNull()
    d.reset()
    expect(d.detect()).toBeNull()
  })
})
