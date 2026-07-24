import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { DoomLoopDetector } from "./doom-loop.js"
import type { SessionState } from "../types/settings.js"

export interface GuardModules {
  doomLoop: DoomLoopDetector
  state: SessionState
  /** Optional name-streak counter lives on doomLoop via recordName if present. */
}

const TRAIN_BASH_RE =
  /\b(python3?|torchrun|accelerate|jupyter|papermill|lightgbm|xgboost|optuna)\b.*\b(train|fit|main\.py|run_train)/i

const NAME_STREAK = 5

/**
 * Wire doom-loop detection and soft bash→experiment_run nudge on tool_call.
 * Does not hard-block by default (warn only) so competition work isn't stalled.
 */
export function installToolGuards(
  pi: ExtensionAPI,
  getModules: (ctx: any) => GuardModules & { nameHistory?: string[] },
) {
  // Key name history by doomLoop instance (stable per session modules)
  const nameHistories = new WeakMap<object, string[]>()

  pi.on("tool_call", async (event, ctx) => {
    let mods: GuardModules
    try {
      mods = getModules(ctx)
    } catch {
      return undefined
    }

    const toolName = event.toolName
    const args =
      event.input && typeof event.input === "object"
        ? (event.input as Record<string, unknown>)
        : {}

    mods.doomLoop.record({ name: toolName, args })

    // Name-only streak (args may change — analysis showed ml_search ×18)
    let names = nameHistories.get(mods.doomLoop)
    if (!names) {
      names = []
      nameHistories.set(mods.doomLoop, names)
    }
    names.push(toolName)
    if (names.length > 20) names.splice(0, names.length - 20)

    const exactHit = mods.doomLoop.detect()
    let nameHit: string | null = null
    if (names.length >= NAME_STREAK) {
      const tail = names.slice(-NAME_STREAK)
      if (tail.every((n) => n === tail[0])) {
        nameHit = `Detected ${NAME_STREAK}+ consecutive calls to "${tail[0]}" (varying args). Change approach.`
      }
    }

    const warning = exactHit || nameHit
    if (warning) {
      mods.state.lastDoomWarning = warning
      try {
        ctx.ui?.notify?.(`⚠️ Doom loop: ${warning}`, "warning")
      } catch {
        // ui optional
      }
      // Soft: do not block; agent sees notify + next system injection
    }

    // Soft nudge: training-like bash → prefer experiment_run
    if (toolName === "bash" && typeof args.command === "string") {
      const cmd = args.command as string
      if (TRAIN_BASH_RE.test(cmd) && !mods.state.bashTrainNudgeShown) {
        mods.state.bashTrainNudgeShown = true
        try {
          ctx.ui?.notify?.(
            "Prefer experiment_run so logs/artifacts/status are tracked (bash training bypasses the runner).",
            "info",
          )
        } catch {
          // ignore
        }
      }
    }

    return undefined
  })
}
