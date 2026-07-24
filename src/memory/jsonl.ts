import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { withFileLock } from "../util/file-lock.js"

export class JsonlStore<T extends object> {
  constructor(private filePath: string) {}

  private lockPath(): string {
    return this.filePath + ".lock"
  }

  async append(record: T): Promise<void> {
    await withFileLock(this.lockPath(), async () => {
      await mkdir(dirname(this.filePath), { recursive: true })
      await appendFile(this.filePath, JSON.stringify(record) + "\n", "utf-8")
    })
  }

  async readAll(): Promise<T[]> {
    try {
      const content = await readFile(this.filePath, "utf-8")
      const records: T[] = []
      for (const line of content.split("\n")) {
        if (!line.trim()) continue
        try {
          records.push(JSON.parse(line) as T)
        } catch {
          // skip corrupt lines
        }
      }
      return records
    } catch {
      return []
    }
  }

  async find(predicate: (r: T) => boolean): Promise<T | undefined> {
    const records = await this.readAll()
    return records.find(predicate)
  }

  async filter(predicate: (r: T) => boolean): Promise<T[]> {
    const records = await this.readAll()
    return records.filter(predicate)
  }

  async update(
    predicate: (r: T) => boolean,
    patch: Partial<T> | T,
  ): Promise<void> {
    await withFileLock(this.lockPath(), async () => {
      const records = await this.readAllUnlocked()
      const updated = records.map((r) => {
        if (!predicate(r)) return r
        // Full record replace when patch looks complete (has same keys + more),
        // otherwise shallow merge.
        return { ...r, ...patch }
      })
      await this.writeAllUnlocked(updated)
    })
  }

  async remove(predicate: (r: T) => boolean): Promise<void> {
    await withFileLock(this.lockPath(), async () => {
      const records = await this.readAllUnlocked()
      await this.writeAllUnlocked(records.filter((r) => !predicate(r)))
    })
  }

  async writeAll(records: T[]): Promise<void> {
    await withFileLock(this.lockPath(), async () => {
      await this.writeAllUnlocked(records)
    })
  }

  /** Unlocked read — caller must hold lock for RMW. */
  private async readAllUnlocked(): Promise<T[]> {
    try {
      const content = await readFile(this.filePath, "utf-8")
      const records: T[] = []
      for (const line of content.split("\n")) {
        if (!line.trim()) continue
        try {
          records.push(JSON.parse(line) as T)
        } catch {
          // skip corrupt lines
        }
      }
      return records
    } catch {
      return []
    }
  }

  private async writeAllUnlocked(records: T[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const content = records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : "")
    await writeFile(this.filePath, content, "utf-8")
  }
}
