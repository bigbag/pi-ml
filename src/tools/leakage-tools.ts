import { Type } from "typebox"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import { runPreflight, formatPreflightReport } from "../leakage/index.js"
import {
  generateDuplicateCheck,
  generateGroupLeakageCheck,
  generateTemporalCheck,
  generateCorrelationCheck,
} from "../leakage/index.js"

export function registerLeakageTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "leak_check",
    label: "Leakage Check",
    description: "Run all leakage checks on data and code",
    promptSnippet: "Check for data leakage issues in your ML pipeline",
    parameters: Type.Object({
      dataPath: Type.String({ description: "Path to dataset" }),
      targetCol: Type.Optional(Type.String()),
      timeCol: Type.Optional(Type.String()),
      groupCol: Type.Optional(Type.String()),
      correlationThreshold: Type.Optional(Type.Number({ default: 0.95 })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const scripts: Array<{ name: string; script: string; description: string }> = []

      if (params.targetCol) {
        const corr = generateCorrelationCheck(params.dataPath, params.targetCol, params.correlationThreshold ?? 0.95)
        scripts.push({ name: "correlation", ...corr })
      }

      if (params.timeCol) {
        const temporal = generateTemporalCheck(params.dataPath, params.timeCol, "split")
        scripts.push({ name: "temporal", ...temporal })
      }

      if (params.groupCol) {
        const group = generateGroupLeakageCheck(params.dataPath, params.groupCol, "split")
        scripts.push({ name: "group_leakage", ...group })
      }

      const dup = generateDuplicateCheck(params.dataPath + ".train", params.dataPath + ".test")
      scripts.push({ name: "duplicates", ...dup })

      const output = scripts.map(s =>
        `### ${s.name}\n${s.description}\n\`\`\`python\n${s.script}\n\`\`\``,
      ).join("\n\n")

      return {
        content: [{ type: "text", text: `Generated ${scripts.length} leakage check scripts:\n\n${output}` }],
        details: { scriptCount: scripts.length },
      }
    },
  })

  pi.registerTool({
    name: "leak_preflight",
    label: "Leak Preflight",
    description: "Pre-experiment validation for leakage risks",
    promptSnippet: "Run preflight leakage checks before an experiment",
    parameters: Type.Object({
      hasTimestamp: Type.Optional(Type.Boolean({ default: false })),
      hasGroups: Type.Optional(Type.Boolean({ default: false })),
      splitStrategy: Type.Optional(Type.String({ default: "random" })),
      classImbalanceRatio: Type.Optional(Type.Number()),
      isStratified: Type.Optional(Type.Boolean({ default: false })),
      usesCV: Type.Optional(Type.Boolean({ default: false })),
      checksGroupLeakage: Type.Optional(Type.Boolean({ default: false })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const profile = {
        columns: [],
        hasTimestampColumn: params.hasTimestamp ?? false,
        hasPotentialGroupColumn: params.hasGroups ?? false,
        classImbalanceRatio: params.classImbalanceRatio,
      }
      const config = {
        splitStrategy: params.splitStrategy ?? "random",
        stratified: params.isStratified ?? false,
        groupColumn: params.checksGroupLeakage ? "group" : undefined,
      }

      const result = runPreflight(profile, config)
      const report = formatPreflightReport(result)

      return {
        content: [{ type: "text", text: report }],
        details: { passed: result.passed, blockers: result.blockers.length, warnings: result.warnings.length },
      }
    },
  })
}
