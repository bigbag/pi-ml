import { describe, it, expect } from "vitest"
import { GateChecker } from "../../src/patterns/gates.js"

describe("GateChecker", () => {
  const checker = new GateChecker()

  it("gates expensive runs above threshold", () => {
    expect(checker.isExpensiveRun({ estimatedDurationSeconds: 600 }, { maxDurationSeconds: 300 })).toBe(true)
  })

  it("passes runs under threshold", () => {
    expect(checker.isExpensiveRun({ estimatedDurationSeconds: 100 }, { maxDurationSeconds: 300 })).toBe(false)
  })

  it("detects destructive data operations", () => {
    expect(checker.isDestructive("rm -rf data/")).toBe(true)
    expect(checker.isDestructive("rm data.csv")).toBe(true)
    expect(checker.isDestructive("drop table experiments")).toBe(true)
  })

  it("passes safe operations", () => {
    expect(checker.isDestructive("python train.py")).toBe(false)
    expect(checker.isDestructive("cat data.csv | head")).toBe(false)
  })

  it("shouldGate returns true for expensive or destructive", () => {
    expect(checker.shouldGate({ command: "rm -rf data/" })).toBe(true)
    expect(checker.shouldGate({
      command: "python train.py",
      estimatedDurationSeconds: 600,
      thresholds: { maxDurationSeconds: 300 },
    })).toBe(true)
  })

  it("shouldGate returns false for safe cheap operations", () => {
    expect(checker.shouldGate({ command: "python train.py" })).toBe(false)
  })
})
