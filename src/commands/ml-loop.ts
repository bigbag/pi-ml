import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { InvestigationManager } from "../investigation/manager.js"
import { tryAppendUserMessage } from "./ml-agent.js"

export function registerMlLoopCommand(
  pi: ExtensionAPI,
  getManager: (ctx: any) => InvestigationManager,
) {
  pi.registerCommand("ml-loop", {
    description: "Start auto-loop with budget (e.g. /ml-loop 10 or /ml-loop target:0.90)",
    handler: async (args, ctx) => {
      const manager = getManager(ctx)
      const investigations = await manager.list()
      const active = investigations.find(i => i.status === "active")

      if (!active) {
        ctx.ui.notify("No active investigation — let's set one up first.", "info")
        tryAppendUserMessage(ctx,
          "I want to start an auto-loop but there's no active investigation. " +
          "Ask me what ML problem I want to solve, what dataset I'm working with, and what metric to optimize. " +
          "Then create an investigation with investigation_create and start the auto-loop.",
        )
        return
      }

      let budget = 10
      let targetMetric: string | undefined
      let targetValue: number | undefined

      if (args) {
        const trimmed = args.trim()
        if (trimmed.startsWith("target:")) {
          const parts = trimmed.slice(7).split(",")
          targetValue = parseFloat(parts[0])
          targetMetric = parts[1] || "primary"
        } else {
          const n = parseInt(trimmed, 10)
          if (!isNaN(n)) budget = n
        }
      }

      const config = {
        investigationId: active.id,
        budget,
        targetMetric,
        targetValue,
      }

      ctx.ui.notify(
        `Auto-loop started for investigation ${active.id}.\nBudget: ${budget} experiments${targetValue ? `\nTarget: ${targetMetric} = ${targetValue}` : ""}\n\nThe agent will now autonomously run experiments until a stop condition is met.`,
        "info",
      )

      tryAppendUserMessage(ctx,
        `Start auto-loop for investigation ${active.id} with budget=${budget}${targetValue ? `, target ${targetMetric}=${targetValue}` : ""}. ` +
        `Autonomously: reason → pick best hypothesis → run leak preflight → execute experiment → analyze → repeat. ` +
        `Stop when: budget exhausted, target reached, plateau (no improvement for 3 rounds), or I interrupt.`,
      )
    },
  })
}
