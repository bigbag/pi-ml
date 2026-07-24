import { Type } from "typebox"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { Journal } from "../memory/journal.js"
import type { InvestigationManager } from "../investigation/manager.js"
import { generateHypothesisId, rankByExpectedValue } from "../investigation/hypothesis.js"

export function registerHypothesisTools(
  pi: ExtensionAPI,
  getJournal: (ctx: any) => Journal,
  getManager?: (ctx: any) => InvestigationManager,
) {
  pi.registerTool({
    name: "hypothesis_add",
    label: "Add Hypothesis",
    description: "Add a hypothesis with rationale and expected impact",
    promptSnippet: "Record a hypothesis to test in the current investigation",
    parameters: Type.Object({
      investigationId: Type.Optional(Type.String()),
      text: Type.String({ description: "The hypothesis statement" }),
      rationale: Type.String({ description: "Why you think this will work" }),
      expectedImpact: Type.Union([
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
      ]),
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
      const id = generateHypothesisId(params.text)
      await journal.recordHypothesis({
        id,
        investigationId: invId,
        text: params.text,
        rationale: params.rationale,
        status: "pending",
        expectedImpact: params.expectedImpact,
        experiments: [],
        outcome: "",
        timestamp: new Date().toISOString(),
      })
      return {
        content: [{ type: "text", text: `Hypothesis ${id} added: ${params.text}` }],
        details: { id, investigationId: invId },
      }
    },
  })

  pi.registerTool({
    name: "hypothesis_rank",
    label: "Rank Hypotheses",
    description: "Rank pending hypotheses by expected value",
    parameters: Type.Object({
      investigationId: Type.Optional(Type.String()),
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
      const hypotheses = await journal.getHypotheses({ investigationId: invId })
      const ranked = rankByExpectedValue(hypotheses)
      const lines = ranked.map((h, i) =>
        `${i + 1}. [${h.status}] [${h.expectedImpact}] ${h.text} (exps: ${h.experiments.length})`,
      )
      return {
        content: [{ type: "text", text: lines.join("\n") || "No hypotheses." }],
        details: { count: ranked.length },
      }
    },
  })

  pi.registerTool({
    name: "hypothesis_update",
    label: "Update Hypothesis",
    description: "Mark hypothesis as confirmed or rejected; optionally link experiments",
    parameters: Type.Object({
      id: Type.String(),
      status: Type.Union([
        Type.Literal("confirmed"),
        Type.Literal("rejected"),
        Type.Literal("testing"),
      ]),
      outcome: Type.Optional(Type.String({ description: "What happened" })),
      experimentId: Type.Optional(Type.String({ description: "Link an experiment id" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const journal = getJournal(ctx)
      await journal.updateHypothesis(params.id, {
        status: params.status,
        outcome: params.outcome ?? "",
      })
      if (params.experimentId) {
        await journal.linkExperimentToHypothesis(params.id, params.experimentId)
      }
      return {
        content: [{
          type: "text",
          text: `Hypothesis ${params.id} → ${params.status}${params.outcome ? ": " + params.outcome : ""}${params.experimentId ? ` (linked ${params.experimentId})` : ""}`,
        }],
        details: { id: params.id, status: params.status },
      }
    },
  })
}
