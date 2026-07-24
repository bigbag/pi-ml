import { describe, it, expect } from "vitest"
import { DoomLoopDetector } from "../../src/patterns/doom-loop.js"
import { installToolGuards } from "../../src/patterns/tool-guard.js"
import type { SessionState } from "../../src/types/settings.js"

describe("tool-guard", () => {
  it("records doom loop and sets lastDoomWarning on streak", async () => {
    const handlers: Array<(e: any, ctx: any) => any> = []
    const pi = {
      on(event: string, handler: any) {
        if (event === "tool_call") handlers.push(handler)
      },
    } as any

    const doomLoop = new DoomLoopDetector()
    const state = { lastDoomWarning: undefined } as SessionState
    const notifies: string[] = []

    installToolGuards(pi, () => ({ doomLoop, state }))

    const ctx = {
      ui: {
        notify(msg: string) {
          notifies.push(msg)
        },
      },
    }

    // Same args → exact doom
    for (let i = 0; i < 3; i++) {
      await handlers[0]({ toolName: "ml_search", input: { q: "same" } }, ctx)
    }
    expect(state.lastDoomWarning).toBeTruthy()
    expect(notifies.some((n) => n.includes("Doom loop"))).toBe(true)
  })

  it("detects name-only streaks with varying args", async () => {
    const handlers: Array<(e: any, ctx: any) => any> = []
    const pi = {
      on(event: string, handler: any) {
        if (event === "tool_call") handlers.push(handler)
      },
    } as any

    const doomLoop = new DoomLoopDetector()
    const state = {} as SessionState
    const notifies: string[] = []

    installToolGuards(pi, () => ({ doomLoop, state }))
    const ctx = {
      ui: {
        notify(msg: string) {
          notifies.push(msg)
        },
      },
    }

    for (let i = 0; i < 5; i++) {
      await handlers[0]({ toolName: "ml_search", input: { q: `q${i}` } }, ctx)
    }
    expect(notifies.some((n) => n.includes("consecutive"))).toBe(true)
  })
})
