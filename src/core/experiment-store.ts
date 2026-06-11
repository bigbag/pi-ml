import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ExperimentId, ExperimentRecord, ExperimentStatus } from "./experiment-types.js";

export class ExperimentStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async readAll(): Promise<ExperimentRecord[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      return raw
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l) as ExperimentRecord);
    } catch {
      return [];
    }
  }

  private async append(record: ExperimentRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, JSON.stringify(record) + "\n");
  }

  private async rewrite(records: ExperimentRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
    await fs.writeFile(this.filePath, lines);
  }

  async create(partial: Partial<ExperimentRecord> & Pick<ExperimentRecord, "id">): Promise<ExperimentRecord> {
    const record: ExperimentRecord = {
      name: partial.name ?? partial.id,
      hyperparameters: partial.hyperparameters ?? {},
      codeArtifactId: partial.codeArtifactId,
      configArtifactId: partial.configArtifactId,
      id: partial.id,
      createdAt: Date.now(),
      status: partial.status ?? "planned",
      tags: partial.tags ?? [],
      derivedExperimentIds: partial.derivedExperimentIds ?? [],
    };
    await this.append(record);
    return record;
  }

  async get(id: ExperimentId): Promise<ExperimentRecord | undefined> {
    const all = await this.readAll();
    return all.find((r) => r.id === id);
  }

  async list(): Promise<ExperimentRecord[]> {
    return this.readAll();
  }

  async updateStatus(id: ExperimentId, status: ExperimentStatus): Promise<void> {
    const all = await this.readAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Experiment not found: ${id}`);
    all[idx].status = status;
    if (status === "running" && !all[idx].startedAt) {
      all[idx].startedAt = Date.now();
    }
    if ((status === "completed" || status === "failed" || status === "aborted") && !all[idx].completedAt) {
      all[idx].completedAt = Date.now();
    }
    await this.rewrite(all);
  }

  async update(id: ExperimentId, updates: Partial<Omit<ExperimentRecord, "id">>): Promise<void> {
    const all = await this.readAll();
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Experiment not found: ${id}`);
    all[idx] = { ...all[idx], ...updates };
    await this.rewrite(all);
  }
}
