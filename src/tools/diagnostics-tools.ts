import { Type } from "typebox"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { classifyFailure, parseTrainingLog, getTree } from "../diagnostics/index.js"
import type { Evidence } from "../diagnostics/index.js"

function coerceMetrics(m?: Record<string, unknown>): Record<string, number> | null {
  if (!m) return null
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(m)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v
    else if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) out[k] = Number(v)
    // skip non-numeric keys like "device": "cpu" or ranges "3.0-4.0"
  }
  return out
}

export function registerDiagnosticsTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "diagnose",
    label: "Diagnose Failure",
    description: "Classify experiment failure and walk diagnostic tree or systematic debug",
    promptSnippet: "Diagnose why an experiment failed or produced unexpected results",
    parameters: Type.Object({
      trainMetrics: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      valMetrics: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      testMetrics: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      lossHistory: Type.Optional(Type.Array(Type.Number())),
      classDistribution: Type.Optional(Type.Record(Type.String(), Type.Number())),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const evidence: Evidence = {
        trainMetrics: coerceMetrics(params.trainMetrics as Record<string, unknown> | undefined),
        valMetrics: coerceMetrics(params.valMetrics as Record<string, unknown> | undefined),
        testMetrics: coerceMetrics(params.testMetrics as Record<string, unknown> | undefined),
        lossHistory: params.lossHistory ?? [],
        classDistribution: params.classDistribution ?? null,
      }

      const failureType = classifyFailure(evidence)
      const tree = getTree(failureType)

      const lines: string[] = [
        `**Failure type:** ${failureType}`,
      ]

      if (tree) {
        lines.push(`**Trigger:** ${tree.triggerCondition}`)
        lines.push("")
        lines.push("**Diagnostic checks:**")
        for (const node of tree.nodes) {
          lines.push(`- **${node.check}**`)
          lines.push(`  Indicators: ${node.indicators.join("; ")}`)
          lines.push(`  Suggestions: ${node.suggestions.join("; ")}`)
        }
      } else {
        lines.push("")
        lines.push("No diagnostic tree for this failure type. Use systematic debugging:")
        lines.push("1. Collect all evidence (logs, metrics, outputs)")
        lines.push("2. Enumerate possible causes, rank by likelihood")
        lines.push("3. Test top hypothesis with minimal experiment")
        lines.push("4. Eliminate or confirm, repeat")
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { failureType, hasTree: !!tree },
      }
    },
  })

  pi.registerTool({
    name: "analyze_output",
    label: "Analyze Output",
    description: "Parse training logs, extract metrics, detect anomalies",
    promptSnippet: "Analyze training output logs for metrics and issues",
    parameters: Type.Object({
      logText: Type.String({ description: "Training log output text" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const parsed = parseTrainingLog(params.logText)

      const lines: string[] = [
        `**Epochs:** ${parsed.epochs}`,
        `**Has NaN:** ${parsed.hasNaN}`,
      ]

      if (parsed.lossHistory.length > 0) {
        lines.push(`**Loss:** ${parsed.lossHistory[0].toFixed(4)} → ${parsed.lossHistory[parsed.lossHistory.length - 1].toFixed(4)}`)
      }

      if (parsed.valLossHistory.length > 0) {
        lines.push(`**Val Loss:** ${parsed.valLossHistory[0].toFixed(4)} → ${parsed.valLossHistory[parsed.valLossHistory.length - 1].toFixed(4)}`)
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          epochs: parsed.epochs,
          hasNaN: parsed.hasNaN,
          lossHistory: parsed.lossHistory,
          valLossHistory: parsed.valLossHistory,
        },
      }
    },
  })
}
