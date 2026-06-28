import { describe, it, expect } from "vitest"
import { runPreflight } from "../../src/leakage/preflight.js"

describe("runPreflight", () => {
  it("passes when no rules trigger", () => {
    const profile = {
      columns: [{ name: "x", type: "numeric" }],
      hasTimestampColumn: false,
    }
    const config = { splitStrategy: "stratified_kfold" }
    const result = runPreflight(profile, config)
    expect(result.passed).toBe(true)
    expect(result.blockers).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it("fails on error-severity checks", () => {
    const profile = {
      columns: [{ name: "x", type: "numeric" }],
      hasTimestampColumn: false,
    }
    const config = { splitStrategy: "random" }
    const extraChecks = [
      {
        type: "train-test-contamination" as const,
        name: "duplicate-rows",
        passed: false,
        severity: "error" as const,
        message: "50 duplicate rows found",
        suggestion: "Remove duplicates",
        evidence: "",
      },
    ]
    const result = runPreflight(profile, config, extraChecks)
    expect(result.passed).toBe(false)
    expect(result.blockers).toHaveLength(1)
    expect(result.blockers[0].name).toBe("duplicate-rows")
  })

  it("passes with warnings only", () => {
    const profile = {
      columns: [{ name: "date", type: "datetime" }],
      hasTimestampColumn: true,
    }
    const config = { splitStrategy: "random" }
    const result = runPreflight(profile, config)
    expect(result.passed).toBe(false)
    expect(result.blockers).toEqual([])
    expect(result.warnings).toHaveLength(1)
  })

  it("combines rule checks with extra checks", () => {
    const profile = {
      columns: [{ name: "date", type: "datetime" }],
      hasTimestampColumn: true,
    }
    const config = { splitStrategy: "random" }
    const extraChecks = [
      {
        type: "feature" as const,
        name: "high-correlation",
        passed: false,
        severity: "warning" as const,
        message: "Feature X has 0.98 correlation with target",
        suggestion: "Remove or investigate feature X",
        evidence: "",
      },
    ]
    const result = runPreflight(profile, config, extraChecks)
    expect(result.checks.length).toBeGreaterThanOrEqual(2)
    expect(result.warnings).toHaveLength(2)
  })

  it("treats info-level issues as passing", () => {
    const profile = {
      columns: [{ name: "user_id", type: "categorical" }],
      hasTimestampColumn: false,
      hasPotentialGroupColumn: true,
    }
    const config = { splitStrategy: "kfold", groupColumn: undefined }
    const result = runPreflight(profile, config)
    expect(result.passed).toBe(true)
    expect(result.checks).toHaveLength(1)
    expect(result.checks[0].severity).toBe("info")
  })
})
