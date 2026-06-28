const DESTRUCTIVE_PATTERNS = [
  /\brm\s+(-[a-z]*\s+)*\S/i,
  /\bdrop\s+(table|database|schema)\b/i,
  /\btruncate\s+table\b/i,
  /\bdelete\s+from\b/i,
  /\bshred\b/i,
]

export interface GateThresholds {
  maxDurationSeconds: number
}

export interface GateAction {
  command: string
  estimatedDurationSeconds?: number
  thresholds?: GateThresholds
}

export class GateChecker {
  isExpensiveRun(
    run: { estimatedDurationSeconds: number },
    thresholds: GateThresholds,
  ): boolean {
    return run.estimatedDurationSeconds > thresholds.maxDurationSeconds
  }

  isDestructive(command: string): boolean {
    return DESTRUCTIVE_PATTERNS.some(p => p.test(command))
  }

  shouldGate(action: GateAction): boolean {
    if (this.isDestructive(action.command)) return true
    if (
      action.estimatedDurationSeconds !== undefined &&
      action.thresholds &&
      this.isExpensiveRun(
        { estimatedDurationSeconds: action.estimatedDurationSeconds },
        action.thresholds,
      )
    ) {
      return true
    }
    return false
  }
}
