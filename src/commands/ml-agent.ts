import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { InvestigationManager } from "../investigation/manager.js"
import type { Journal } from "../memory/journal.js"
import { generateBriefing } from "../investigation/briefing.js"

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
        ctx.ui.notify(
          `No active investigation.\n\nPaused investigations:\n${list}\n\nUse investigation_resume to continue one, or investigation_create to start new.`,
          "info",
        )
      } else {
        ctx.ui.notify(
          "No investigations found. Use investigation_create to start one.",
          "info",
        )
      }
    },
  })
}
