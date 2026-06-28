import { readFile, writeFile, appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"

export class JsonlStore<T extends object> {
  constructor(private filePath: string) {}

  async append(record: T): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await appendFile(this.filePath, JSON.stringify(record) + "\n", "utf-8")
  }

  async readAll(): Promise<T[]> {
    try {
      const content = await readFile(this.filePath, "utf-8")
      return content
        .split("\n")
        .filter(line => line.trim())
        .map(line => JSON.parse(line) as T)
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
    patch: Partial<T>,
  ): Promise<void> {
    const records = await this.readAll()
    const updated = records.map(r =>
      predicate(r) ? { ...r, ...patch } : r,
    )
    await this.writeAll(updated)
  }

  async remove(predicate: (r: T) => boolean): Promise<void> {
    const records = await this.readAll()
    await this.writeAll(records.filter(r => !predicate(r)))
  }

  private async writeAll(records: T[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const content = records.map(r => JSON.stringify(r)).join("\n") + "\n"
    await writeFile(this.filePath, content, "utf-8")
  }
}
