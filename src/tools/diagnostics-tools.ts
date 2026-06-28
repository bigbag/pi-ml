import { Type } from "typebox"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { classifyFailure, parseTrainingLog, extractEvidence, getTree } from "../diagnostics/index.js"
import type { Evidence } from "../diagnostics/index.js"

export function registerDiagnosticsTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "diagnose",
    label: "Diagnose Failure",
    description: "Classify experiment failure and walk diagnostic tree or systematic debug",
    promptSnippet: "Diagnose why an experiment failed or produced unexpected results",
    parameters: Type.Object({
      trainMetrics: Type.Optional(Type.Record(Type.String(), Type.Number())),
      valMetrics: Type.Optional(Type.Record(Type.String(), Type.Number())),
      testMetrics: Type.Optional(Type.Record(Type.String(), Type.Number())),
      lossHistory: Type.Optional(Type.Array(Type.Number())),
      classDistribution: Type.Optional(Type.Record(Type.String(), Type.Number())),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const evidence: Evidence = {
        trainMetrics: params.trainMetrics ?? null,
        valMetrics: params.valMetrics ?? null,
        testMetrics: params.testMetrics ?? null,
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

      const metricEntries = Object.entries(parsed.finalMetrics)
      if (metricEntries.length > 0) {
        lines.push("**Final Metrics:**")
        for (const [name, value] of metricEntries) {
          lines.push(`  ${name}: ${value}`)
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: parsed,
      }
    },
  })
}
