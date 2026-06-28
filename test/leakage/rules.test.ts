import { describe, it, expect } from "vitest"
import { evaluateRules } from "../../src/leakage/rules.js"

describe("evaluateRules", () => {
  it("warns on random split with timestamp column", () => {
    const profile = {
      columns: [
        { name: "date", type: "datetime" },
        { name: "price", type: "numeric" },
      ],
      hasTimestampColumn: true,
    }
    const config = { splitStrategy: "random" }
    const checks = evaluateRules(profile, config)
    const temporal = checks.find(c => c.type === "temporal")
    expect(temporal).toBeDefined()
    expect(temporal!.passed).toBe(false)
    expect(temporal!.severity).toBe("warning")
  })

  it("warns on no stratification with class imbalance", () => {
    const profile = {
      columns: [],
      hasTimestampColumn: false,
      classImbalanceRatio: 10,
    }
    const config = { splitStrategy: "random", stratified: false }
    const checks = evaluateRules(profile, config)
    const imb = checks.find(c => c.type === "validation-strategy")
    expect(imb).toBeDefined()
    expect(imb!.passed).toBe(false)
  })

  it("warns on CV with no group check when group column exists", () => {
    const profile = {
      columns: [
        { name: "user_id", type: "categorical" },
      ],
      hasTimestampColumn: false,
      hasPotentialGroupColumn: true,
    }
    const config = { splitStrategy: "kfold", groupColumn: undefined }
    const checks = evaluateRules(profile, config)
    const group = checks.find(c => c.type === "cross-validation")
    expect(group).toBeDefined()
    expect(group!.severity).toBe("info")
  })

  it("returns empty array when no issues detected", () => {
    const profile = {
      columns: [{ name: "x", type: "numeric" }],
      hasTimestampColumn: false,
    }
    const config = { splitStrategy: "stratified_kfold" }
    const checks = evaluateRules(profile, config)
    expect(checks).toEqual([])
  })
})
