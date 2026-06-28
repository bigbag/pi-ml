import { Type } from "typebox"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { InvestigationManager } from "../investigation/manager.js"
import type { Journal } from "../memory/journal.js"
import { generateBriefing } from "../investigation/briefing.js"

export function registerInvestigationTools(
  pi: ExtensionAPI,
  getManager: (ctx: any) => InvestigationManager,
  getJournal: (ctx: any) => Journal,
) {
  pi.registerTool({
    name: "investigation_create",
    label: "Create Investigation",
    description: "Start a new ML investigation with a goal",
    promptSnippet: "Create a persistent investigation to track ML experiments",
    parameters: Type.Object({
      goal: Type.String({ description: "What you're trying to achieve" }),
      dataset: Type.String({ description: "Dataset path or description" }),
      problemType: Type.String({ description: "regression, classification, nlp, etc." }),
      constraints: Type.Optional(Type.Array(Type.String())),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const manager = getManager(ctx)
      const id = await manager.create(params.goal, params.dataset, params.problemType, params.constraints)
      return {
        content: [{ type: "text", text: `Investigation ${id} created.\nGoal: ${params.goal}\nDataset: ${params.dataset}\nType: ${params.problemType}` }],
        details: { id },
      }
    },
  })

  pi.registerTool({
    name: "investigation_resume",
    label: "Resume Investigation",
    description: "Load and brief on a paused investigation",
    parameters: Type.Object({
      id: Type.String({ description: "Investigation ID" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const manager = getManager(ctx)
      await manager.resume(params.id)
      const inv = await manager.load(params.id)
      const briefing = generateBriefing(inv)
      return {
        content: [{ type: "text", text: briefing }],
        details: { id: params.id, status: inv.status },
      }
    },
  })

  pi.registerTool({
    name: "investigation_status",
    label: "Investigation Status",
    description: "Show current investigation state, best results, open items",
    parameters: Type.Object({
      id: Type.Optional(Type.String({ description: "Investigation ID (defaults to active)" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const manager = getManager(ctx)
      let id = params.id
      if (!id) {
        const all = await manager.list()
        const active = all.find(i => i.status === "active")
        if (!active) {
          return {
            content: [{ type: "text", text: "No active investigation. Use investigation_create to start one." }],
            details: { found: false },
          }
        }
        id = active.id
      }
      const inv = await manager.load(id)
      const briefing = generateBriefing(inv)
      return {
        content: [{ type: "text", text: briefing }],
        details: { id, status: inv.status },
      }
    },
  })

  pi.registerTool({
    name: "investigation_pause",
    label: "Pause Investigation",
    description: "Save investigation state for later",
    parameters: Type.Object({
      id: Type.String({ description: "Investigation ID" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const manager = getManager(ctx)
      await manager.pause(params.id)
      return {
        content: [{ type: "text", text: `Investigation ${params.id} paused. Resume later with investigation_resume.` }],
        details: { id: params.id },
      }
    },
  })

  pi.registerTool({
    name: "investigation_close",
    label: "Close Investigation",
    description: "Mark investigation as done with summary",
    parameters: Type.Object({
      id: Type.String({ description: "Investigation ID" }),
      summary: Type.String({ description: "Summary of results and findings" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const manager = getManager(ctx)
      await manager.close(params.id)
      return {
        content: [{ type: "text", text: `Investigation ${params.id} closed.\nSummary: ${params.summary}` }],
        details: { id: params.id },
      }
    },
  })
}
