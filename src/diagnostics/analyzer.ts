import type { Evidence } from "./classifier.js"

export interface ParsedLog {
  epochs: number
  lossHistory: number[]
  valLossHistory: number[]
  finalMetrics: Record<string, number>
  hasNaN: boolean
}

export interface ExperimentResult {
  metrics: Record<string, number>
  log: string
}

export interface DatasetProfile {
  targetAnalysis: { type: string } | null
  classDistribution: Record<string | number, number> | null
}

const EPOCH_PATTERNS = [
  /Epoch\s+(\d+)\/?\d*\s*[-–]\s*loss:\s*([\d.eE+-]+)(?:\s*[-–]\s*val_loss:\s*([\d.eE+-]+))?/gi,
  /\[Epoch\s+(\d+)\]\s*loss[=:]\s*([\d.eE+-]+)(?:\s*val_loss[=:]\s*([\d.eE+-]+))?/gi,
]

const METRIC_PATTERN = /^(accuracy|precision|recall|f1|auc|rmse|mae|r2|mse|loss):\s*([\d.eE+-]+)$/gim

const NAN_INF_PATTERN = /(?:loss[=:]?\s*)(NaN|inf|-inf)/i

export function parseTrainingLog(text: string): ParsedLog {
  const result: ParsedLog = {
    epochs: 0,
    lossHistory: [],
    valLossHistory: [],
    finalMetrics: {},
    hasNaN: false,
  }

  if (!text) return result

  if (NAN_INF_PATTERN.test(text)) {
    result.hasNaN = true
  }

  for (const pattern of EPOCH_PATTERNS) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const lossVal = parseFloat(match[2])
      result.lossHistory.push(lossVal)
      if (!Number.isFinite(lossVal)) result.hasNaN = true

      if (match[3]) {
        const valLoss = parseFloat(match[3])
        result.valLossHistory.push(valLoss)
        if (!Number.isFinite(valLoss)) result.hasNaN = true
      }

      result.epochs = Math.max(result.epochs, result.lossHistory.length)
    }
    if (result.lossHistory.length > 0) break
  }

  METRIC_PATTERN.lastIndex = 0
  let metricMatch: RegExpExecArray | null
  while ((metricMatch = METRIC_PATTERN.exec(text)) !== null) {
    result.finalMetrics[metricMatch[1]] = parseFloat(metricMatch[2])
  }

  return result
}

const TRAIN_PREFIXES = ["train_", "training_"]
const VAL_PREFIXES = ["val_", "valid_", "validation_"]
const TEST_PREFIXES = ["test_"]

function splitMetricsByPrefix(metrics: Record<string, number>): {
  train: Record<string, number>
  val: Record<string, number>
  test: Record<string, number>
  unprefixed: Record<string, number>
} {
  const train: Record<string, number> = {}
  const val: Record<string, number> = {}
  const test: Record<string, number> = {}
  const unprefixed: Record<string, number> = {}

  for (const [key, value] of Object.entries(metrics)) {
    const lk = key.toLowerCase()
    const trainPrefix = TRAIN_PREFIXES.find(p => lk.startsWith(p))
    const valPrefix = VAL_PREFIXES.find(p => lk.startsWith(p))
    const testPrefix = TEST_PREFIXES.find(p => lk.startsWith(p))

    if (trainPrefix) {
      train[lk.slice(trainPrefix.length)] = value
    } else if (valPrefix) {
      val[lk.slice(valPrefix.length)] = value
    } else if (testPrefix) {
      test[lk.slice(testPrefix.length)] = value
    } else {
      unprefixed[lk] = value
    }
  }

  return { train, val, test, unprefixed }
}

export function extractEvidence(experimentResult: ExperimentResult, datasetProfile: DatasetProfile): Evidence {
  const parsed = parseTrainingLog(experimentResult.log)
  const { train, val, test, unprefixed } = splitMetricsByPrefix(experimentResult.metrics)

  const hasTrainMetrics = Object.keys(train).length > 0
  const hasValMetrics = Object.keys(val).length > 0
  const hasTestMetrics = Object.keys(test).length > 0
  const hasUnprefixed = Object.keys(unprefixed).length > 0

  return {
    trainMetrics: hasTrainMetrics ? train : hasUnprefixed ? unprefixed : null,
    valMetrics: hasValMetrics ? val : null,
    testMetrics: hasTestMetrics ? test : null,
    lossHistory: parsed.lossHistory,
    classDistribution: datasetProfile.classDistribution ?? null,
  }
}
