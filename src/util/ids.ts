import { randomBytes } from "node:crypto"

/**
 * Generate a unique prefixed id that is safe under burst/parallel tool calls.
 * Format: `{prefix}-{time36}-{12 hex chars}`
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36)
  const rand = randomBytes(6).toString("hex")
  return `${prefix}-${time}-${rand}`
}
