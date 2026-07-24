import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { InvestigationManager } from "../investigation/manager.js"
import { tryAppendUserMessage } from "./ml-agent.js"
import type { LoopState } from "../types/investigation.js"

export function registerMlLoopCommand(
  pi: ExtensionAPI,
  getManager: (ctx: any) => InvestigationManager,
) {
  pi.registerCommand("ml-loop", {
    description: "Start auto-loop with budget (e.g. /ml-loop 10 or /ml-loop target:0.90)",
    handler: async (args, ctx) => {
      const manager = getManager(ctx)
      const investigations = await manager.list()
      const active = investigations.find((i) => i.status === "active")

      if (!active) {
        ctx.ui.notify("No active investigation — let's set one up first.", "info")
        tryAppendUserMessage(
          ctx,
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

      const loop: LoopState = {
        budget,
        experimentsRun: 0,
        roundsSinceImprovement: 0,
        targetMetric,
        targetValue,
        targetDirection: "above",
        active: true,
      }
      await manager.setLoopState(active.id, loop)

      ctx.ui.notify(
        `Auto-loop started for investigation ${active.id}.\nBudget: ${budget} experiments${
          targetValue ? `\nTarget: ${targetMetric} = ${targetValue}` : ""
        }\n\nStop conditions are tracked in investigation state after each experiment_run.`,
        "info",
      )

      tryAppendUserMessage(
        ctx,
        `Start auto-loop investigation=${active.id} budget=${budget}` +
          `${targetValue !== undefined ? ` targetMetric=${targetMetric} targetValue=${targetValue}` : ""}.\n` +
          `After EACH experiment_run you MUST:\n` +
          `1) experiment_track update with metrics\n` +
          `2) finding_record\n` +
          `3) hypothesis_update\n` +
          `4) Call investigation_status\n` +
          `Stop immediately when experimentsRun>=budget OR target met OR plateauRounds>=3.\n` +
          `Do not only journal — each loop iteration needs a run or an explicit skip finding.\n` +
          `Prefer experiment_run over raw bash for training.`,
      )
    },
  })
}
