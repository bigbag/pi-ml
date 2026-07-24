import { open, unlink, mkdir } from "node:fs/promises"
import { dirname } from "node:path"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Portable exclusive file lock via O_EXCL create + retry.
 * Serializes critical sections across concurrent async writers.
 */
export async function withFileLock<T>(
  lockPath: string,
  fn: () => Promise<T>,
  opts: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? 100
  const delayMs = opts.delayMs ?? 10
  await mkdir(dirname(lockPath), { recursive: true }).catch(() => {})

  let handle: Awaited<ReturnType<typeof open>> | undefined
  for (let i = 0; i < retries; i++) {
    try {
      handle = await open(lockPath, "wx")
      break
    } catch {
      await sleep(delayMs)
    }
  }
  if (!handle) throw new Error(`Could not acquire lock: ${lockPath}`)

  try {
    return await fn()
  } finally {
    await handle.close().catch(() => {})
    await unlink(lockPath).catch(() => {})
  }
}
