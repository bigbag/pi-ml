import { describe, it, expect } from "vitest"
import { parseTrainingLog, extractEvidence } from "../../src/diagnostics/analyzer.js"

describe("parseTrainingLog", () => {
  it("extracts epoch metrics from Keras-style format", () => {
    const log = "Epoch 1/10 - loss: 0.5432 - val_loss: 0.6123\nEpoch 2/10 - loss: 0.4321 - val_loss: 0.5890"
    const result = parseTrainingLog(log)
    expect(result.epochs).toBe(2)
    expect(result.lossHistory).toEqual([0.5432, 0.4321])
    expect(result.valLossHistory).toEqual([0.6123, 0.5890])
  })

  it("extracts from bracket format [epoch N]", () => {
    const log = "[Epoch 1] loss=0.55 val_loss=0.60\n[Epoch 2] loss=0.45 val_loss=0.50"
    const result = parseTrainingLog(log)
    expect(result.epochs).toBe(2)
    expect(result.lossHistory).toEqual([0.55, 0.45])
  })

  it("detects NaN in loss", () => {
    const log = "Epoch 1/5 - loss: 0.5\nEpoch 2/5 - loss: NaN"
    const result = parseTrainingLog(log)
    expect(result.hasNaN).toBe(true)
  })

  it("does not flag NaN when all values are finite", () => {
    const log = "Epoch 1/5 - loss: 0.5\nEpoch 2/5 - loss: 0.3"
    const result = parseTrainingLog(log)
    expect(result.hasNaN).toBe(false)
  })

  it("extracts final metrics", () => {
    const log = "accuracy: 0.95\nprecision: 0.92\nrecall: 0.88\nf1: 0.90"
    const result = parseTrainingLog(log)
    expect(result.finalMetrics.accuracy).toBeCloseTo(0.95)
    expect(result.finalMetrics.recall).toBeCloseTo(0.88)
  })

  it("handles empty log gracefully", () => {
    const result = parseTrainingLog("")
    expect(result.epochs).toBe(0)
    expect(result.lossHistory).toEqual([])
    expect(result.hasNaN).toBe(false)
  })

  it("handles log with only text and no metrics", () => {
    const result = parseTrainingLog("Starting training...\nDone.")
    expect(result.epochs).toBe(0)
    expect(result.lossHistory).toEqual([])
  })

  it("detects inf values", () => {
    const log = "Epoch 1/5 - loss: 0.5\nEpoch 2/5 - loss: inf"
    const result = parseTrainingLog(log)
    expect(result.hasNaN).toBe(true)
  })
})

describe("extractEvidence", () => {
  it("builds evidence from experiment result and dataset profile", () => {
    const experimentResult = {
      metrics: { train_rmse: 0.05, val_rmse: 0.15, test_rmse: 0.18 },
      log: "Epoch 1 - loss: 0.3\nEpoch 2 - loss: 0.2",
    }
    const datasetProfile = {
      targetAnalysis: { type: "regression" },
      classDistribution: null,
    }
    const evidence = extractEvidence(experimentResult, datasetProfile)
    expect(evidence.trainMetrics).toEqual({ rmse: 0.05 })
    expect(evidence.valMetrics).toEqual({ rmse: 0.15 })
    expect(evidence.testMetrics).toEqual({ rmse: 0.18 })
    expect(evidence.lossHistory).toEqual([0.3, 0.2])
  })

  it("handles missing metric prefixes", () => {
    const experimentResult = {
      metrics: { accuracy: 0.85, f1: 0.80 },
      log: "",
    }
    const evidence = extractEvidence(experimentResult, { targetAnalysis: null, classDistribution: null })
    expect(evidence.trainMetrics).toEqual({ accuracy: 0.85, f1: 0.80 })
    expect(evidence.valMetrics).toBeNull()
    expect(evidence.testMetrics).toBeNull()
  })

  it("passes through class distribution from profile", () => {
    const evidence = extractEvidence(
      { metrics: {}, log: "" },
      { targetAnalysis: null, classDistribution: { 0: 900, 1: 100 } },
    )
    expect(evidence.classDistribution).toEqual({ 0: 900, 1: 100 })
  })
})
