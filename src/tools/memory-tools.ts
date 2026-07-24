import { Type } from "typebox"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { Journal } from "../memory/journal.js"
import type { KnowledgeStore } from "../memory/knowledge.js"
import type { InvestigationManager } from "../investigation/manager.js"
import { newId } from "../util/ids.js"

const MAX_FINDING_CHARS = 4000

export function registerMemoryTools(
  pi: ExtensionAPI,
  getJournal: (ctx: any) => Journal,
  getKnowledge: (ctx: any) => KnowledgeStore,
  getManager?: (ctx: any) => InvestigationManager,
) {
  pi.registerTool({
    name: "journal_query",
    label: "Query Journal",
    description: "Search experiments, hypotheses, or findings across investigations",
    promptSnippet: "Query the experiment journal for past results and patterns",
    parameters: Type.Object({
      type: Type.Union([
        Type.Literal("experiments"),
        Type.Literal("hypotheses"),
        Type.Literal("findings"),
      ]),
      investigationId: Type.Optional(Type.String()),
      model: Type.Optional(Type.String()),
      status: Type.Optional(Type.String()),
      tags: Type.Optional(Type.Array(Type.String())),
      limit: Type.Optional(Type.Number({ default: 20 })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const journal = getJournal(ctx)
      const limit = params.limit ?? 20
      let results: any[]

      switch (params.type) {
        case "experiments":
          results = await journal.getExperiments({
            investigationId: params.investigationId,
            model: params.model,
          })
          break
        case "hypotheses":
          results = await journal.getHypotheses({
            investigationId: params.investigationId,
            status: params.status as any,
          })
          break
        case "findings":
          results = await journal.getFindings({
            investigationId: params.investigationId,
            tags: params.tags,
          })
          break
      }

      results = results.slice(0, limit)
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        details: { count: results.length, type: params.type },
      }
    },
  })

  pi.registerTool({
    name: "knowledge_search",
    label: "Search Knowledge",
    description: "Find relevant ML patterns and past learnings",
    promptSnippet: "Search the knowledge store for ML patterns and learnings",
    parameters: Type.Object({
      category: Type.Optional(Type.String()),
      problemType: Type.Optional(Type.String()),
      tags: Type.Optional(Type.Array(Type.String())),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const knowledge = getKnowledge(ctx)
      const results: any[] = []

      if (params.category || params.problemType) {
        const patterns = await knowledge.searchPatterns({
          category: params.category,
          problemType: params.problemType,
        })
        results.push(...patterns)
      }

      if (params.tags) {
        const learnings = await knowledge.searchLearnings(params.tags)
        results.push(...learnings)
      }

      if (!params.category && !params.problemType && !params.tags) {
        const all = await knowledge.getAllPatterns()
        results.push(...all)
      }

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
        details: { count: results.length },
      }
    },
  })

  pi.registerTool({
    name: "finding_record",
    label: "Record Finding",
    description: "Record an insight, warning, or decision from an experiment",
    parameters: Type.Object({
      investigationId: Type.Optional(Type.String()),
      type: Type.Optional(Type.Union([
        Type.Literal("insight"),
        Type.Literal("warning"),
        Type.Literal("decision"),
      ])),
      text: Type.String(),
      sourceExperiments: Type.Optional(Type.Array(Type.String())),
      tags: Type.Optional(Type.Array(Type.String())),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const journal = getJournal(ctx)
      let invId = params.investigationId
      if (!invId && getManager) {
        invId = await getManager(ctx).getActiveId()
      }
      if (!invId) {
        throw new Error("No investigationId and no active investigation")
      }

      let text = params.text
      let truncated = false
      if (text.length > MAX_FINDING_CHARS) {
        text = text.slice(0, MAX_FINDING_CHARS) + "…[truncated]"
        truncated = true
      }

      const id = newId("fnd")
      const type = params.type ?? "insight"
      await journal.recordFinding({
        id,
        investigationId: invId,
        type,
        text,
        sourceExperiments: params.sourceExperiments ?? [],
        tags: params.tags ?? [],
        timestamp: new Date().toISOString(),
      })
      return {
        content: [{
          type: "text",
          text: `Finding ${id} recorded: [${type}] ${text}${truncated ? " (truncated)" : ""}`,
        }],
        details: { id, truncated },
      }
    },
  })

  pi.registerTool({
    name: "learning_save",
    label: "Save Learning",
    description: "Promote a finding to persistent knowledge",
    parameters: Type.Object({
      text: Type.String({ description: "The learning to persist" }),
      evidence: Type.Array(Type.String(), { description: "Experiment IDs that support this" }),
      tags: Type.Array(Type.String()),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const knowledge = getKnowledge(ctx)
      const id = newId("lrn")
      await knowledge.addLearning({
        id,
        text: params.text,
        evidence: params.evidence,
        tags: params.tags,
        source: "learned",
        timestamp: new Date().toISOString(),
      })
      return {
        content: [{ type: "text", text: `Learning ${id} saved: ${params.text}` }],
        details: { id },
      }
    },
  })
}
