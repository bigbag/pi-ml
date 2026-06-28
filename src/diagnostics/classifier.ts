import type { FailureType } from "../types/diagnostics.js"

export interface Evidence {
  trainMetrics: Record<string, number> | null
  valMetrics: Record<string, number> | null
  testMetrics: Record<string, number> | null
  lossHistory: number[]
  classDistribution: Record<string | number, number> | null
}

export function classifyFailure(evidence: Evidence): FailureType {
  if (hasNaN(evidence)) return "instability"
  if (isOverfitting(evidence)) return "overfitting"
  if (isImbalanced(evidence)) return "imbalance"
  if (isPoorGeneralization(evidence)) return "generalization"
  if (isUnderfitting(evidence)) return "underfitting"
  if (isSlowConvergence(evidence)) return "convergence"
  return "unknown"
}

function hasNaN(evidence: Evidence): boolean {
  if (evidence.lossHistory.some(v => !Number.isFinite(v))) return true
  for (const metrics of [evidence.trainMetrics, evidence.valMetrics]) {
    if (metrics && Object.values(metrics).some(v => !Number.isFinite(v))) return true
  }
  return false
}

function isOverfitting(evidence: Evidence): boolean {
  if (!evidence.trainMetrics || !evidence.valMetrics) return false
  const trainAcc = evidence.trainMetrics.accuracy
  const valAcc = evidence.valMetrics.accuracy
  if (trainAcc !== undefined && valAcc !== undefined && trainAcc - valAcc > 0.15) return true

  const trainLoss = evidence.trainMetrics.loss
  const valLoss = evidence.valMetrics.loss
  if (trainLoss !== undefined && valLoss !== undefined && valLoss > trainLoss * 2) return true

  return false
}

function isImbalanced(evidence: Evidence): boolean {
  if (!evidence.classDistribution) return false
  const counts = Object.values(evidence.classDistribution)
  if (counts.length < 2) return false
  const maxCount = Math.max(...counts)
  const minCount = Math.min(...counts)
  if (maxCount / minCount < 5) return false

  const metrics = evidence.valMetrics ?? evidence.trainMetrics
  if (!metrics) return false
  const recall = metrics.recall
  const accuracy = metrics.accuracy
  if (recall !== undefined && accuracy !== undefined && accuracy > 0.8 && recall < 0.3) return true

  return false
}

function isPoorGeneralization(evidence: Evidence): boolean {
  if (!evidence.valMetrics || !evidence.testMetrics) return false
  const valAcc = evidence.valMetrics.accuracy
  const testAcc = evidence.testMetrics.accuracy
  if (valAcc !== undefined && testAcc !== undefined && valAcc - testAcc > 0.15) return true
  return false
}

function isUnderfitting(evidence: Evidence): boolean {
  if (!evidence.trainMetrics) return false
  const trainAcc = evidence.trainMetrics.accuracy
  if (trainAcc !== undefined && trainAcc < 0.65) return true
  const trainLoss = evidence.trainMetrics.loss
  if (trainLoss !== undefined && trainLoss > 0.8) return true
  return false
}

function isSlowConvergence(evidence: Evidence): boolean {
  const h = evidence.lossHistory
  if (h.length < 5) return false
  let totalDrop = 0
  for (let i = 1; i < h.length; i++) {
    totalDrop += h[i - 1] - h[i]
  }
  const avgDrop = totalDrop / (h.length - 1)
  const range = h[0] - h[h.length - 1]
  if (range > 0 && avgDrop > 0 && avgDrop < 0.02 && h.length >= 8) return true
  return false
}
