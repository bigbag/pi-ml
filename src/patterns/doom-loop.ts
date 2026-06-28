import { createHash } from "node:crypto"

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export class DoomLoopDetector {
  private history: string[] = []
  private consecutiveThreshold = 3

  record(call: ToolCall): void {
    const hash = this.hashCall(call)
    this.history.push(hash)
  }

  detect(): string | null {
    if (this.history.length < this.consecutiveThreshold) return null

    const consecutive = this.detectConsecutive()
    if (consecutive) return consecutive

    const repeating = this.detectRepeatingSequence()
    if (repeating) return repeating

    return null
  }

  reset(): void {
    this.history = []
  }

  private detectConsecutive(): string | null {
    const len = this.history.length
    if (len < this.consecutiveThreshold) return null

    const last = this.history[len - 1]
    let count = 0
    for (let i = len - 1; i >= 0 && this.history[i] === last; i--) {
      count++
    }
    if (count >= this.consecutiveThreshold) {
      return `Detected ${count} consecutive identical tool calls`
    }
    return null
  }

  private detectRepeatingSequence(): string | null {
    const len = this.history.length
    for (let seqLen = 2; seqLen <= 5; seqLen++) {
      if (len < seqLen * 2) continue
      const tail = this.history.slice(len - seqLen)
      const prev = this.history.slice(len - seqLen * 2, len - seqLen)
      if (tail.every((h, i) => h === prev[i])) {
        return `Detected repeating sequence of length ${seqLen}`
      }
    }
    return null
  }

  private hashCall(call: ToolCall): string {
    const sortedArgs = this.sortKeys(call.args)
    const normalized = JSON.stringify({ name: call.name, args: sortedArgs })
    return createHash("sha256").update(normalized).digest("hex").slice(0, 16)
  }

  private sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      const val = obj[key]
      sorted[key] = val && typeof val === "object" && !Array.isArray(val)
        ? this.sortKeys(val as Record<string, unknown>)
        : val
    }
    return sorted
  }
}
