import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { InvestigationManager } from "../investigation/manager.js"
import type { Journal } from "../memory/journal.js"
import { generateBriefing } from "../investigation/briefing.js"

export function tryAppendUserMessage(ctx: unknown, msg: string) {
  if (typeof (ctx as any).appendUserMessage === "function") {
    (ctx as any).appendUserMessage(msg)
  }
}

export function registerMlAgentCommand(
  pi: ExtensionAPI,
  getManager: (ctx: any) => InvestigationManager,
  getJournal: (ctx: any) => Journal,
) {
  pi.registerCommand("ml-agent", {
    description: "ML Agent — show status, start or resume investigation",
    handler: async (_args, ctx) => {
      const manager = getManager(ctx)
      const investigations = await manager.list()
      const active = investigations.filter(i => i.status === "active")
      const paused = investigations.filter(i => i.status === "paused")

      if (active.length > 0) {
        const inv = await manager.load(active[0].id)
        const briefing = generateBriefing(inv)
        ctx.ui.notify(briefing, "info")
      } else if (paused.length > 0) {
        const list = paused
          .map(i => `- ${i.id}: ${i.goal} (paused ${i.lastActivity})`)
          .join("\n")
        ctx.ui.notify(`Paused investigations:\n${list}`, "info")
        tryAppendUserMessage(ctx,
          `I have ${paused.length} paused investigation(s):\n${list}\n\n` +
          "Ask me which one to resume, or if I want to start a new one.",
        )
      } else {
        ctx.ui.notify("Welcome to ML Agent. Let's start your first investigation.", "info")
        tryAppendUserMessage(ctx,
          "No investigations exist yet. Ask me what ML problem I want to solve, what dataset I'm working with, " +
          "and what constraints I have. Then create an investigation with investigation_create and help me form initial hypotheses.",
        )
      }
    },
  })
}
