import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ExperimentId, ExperimentRecord, ExperimentStatus } from "../types/experiment.js";
import { withFileLock } from "../util/file-lock.js";

export class ExperimentStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private lockPath(): string {
    return this.filePath + ".lock";
  }

  private async readAllUnlocked(): Promise<ExperimentRecord[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const records: ExperimentRecord[] = [];
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          records.push(JSON.parse(line) as ExperimentRecord);
        } catch {
          // skip corrupt lines
        }
      }
      return records;
    } catch {
      return [];
    }
  }

  private async rewriteUnlocked(records: ExperimentRecord[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const lines = records.length
      ? records.map((r) => JSON.stringify(r)).join("\n") + "\n"
      : "";
    await fs.writeFile(this.filePath, lines);
  }

  /**
   * Create or upsert an experiment by id.
   * Concurrent creates with the same id merge into one record.
   */
  async create(partial: Partial<ExperimentRecord> & Pick<ExperimentRecord, "id">): Promise<ExperimentRecord> {
    return withFileLock(this.lockPath(), async () => {
      const all = await this.readAllUnlocked();
      const idx = all.findIndex((r) => r.id === partial.id);
      if (idx >= 0) {
        all[idx] = {
          ...all[idx],
          ...partial,
          id: partial.id,
          // preserve original createdAt on upsert
          createdAt: all[idx].createdAt,
        };
        await this.rewriteUnlocked(all);
        return all[idx];
      }

      const record: ExperimentRecord = {
        name: partial.name ?? partial.id,
        hypothesis: partial.hypothesis ?? "",
        hyperparameters: partial.hyperparameters ?? {},
        codeArtifactId: partial.codeArtifactId ?? "",
        configArtifactId: partial.configArtifactId ?? "",
        id: partial.id,
        createdAt: Date.now(),
        status: partial.status ?? "planned",
        tags: partial.tags ?? [],
        derivedExperimentIds: partial.derivedExperimentIds ?? [],
        investigationId: partial.investigationId,
        hypothesisId: partial.hypothesisId,
        results: partial.results,
        parentExperimentId: partial.parentExperimentId,
        metricArtifactId: partial.metricArtifactId,
        predictionArtifactId: partial.predictionArtifactId,
        startedAt: partial.startedAt,
        completedAt: partial.completedAt,
      };
      all.push(record);
      await this.rewriteUnlocked(all);
      return record;
    });
  }

  async getOrCreate(
    id: string,
    defaults: Partial<ExperimentRecord> = {},
  ): Promise<ExperimentRecord> {
    const existing = await this.get(id);
    if (existing) return existing;
    return this.create({ id, name: defaults.name ?? id, ...defaults });
  }

  async get(id: ExperimentId): Promise<ExperimentRecord | undefined> {
    const all = await this.readAllUnlocked();
    return all.find((r) => r.id === id);
  }

  async list(filter?: { investigationId?: string }): Promise<ExperimentRecord[]> {
    const all = await this.readAllUnlocked();
    if (!filter?.investigationId) return all;
    return all.filter((r) => r.investigationId === filter.investigationId);
  }

  async updateStatus(id: ExperimentId, status: ExperimentStatus): Promise<void> {
    await withFileLock(this.lockPath(), async () => {
      const all = await this.readAllUnlocked();
      const idx = all.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Experiment not found: ${id}`);
      all[idx].status = status;
      if (status === "running") {
        all[idx].startedAt = Date.now();
        // Clear prior completion so re-runs get a fresh completedAt.
        delete all[idx].completedAt;
      }
      if (status === "completed" || status === "failed" || status === "aborted") {
        all[idx].completedAt = Date.now();
      }
      await this.rewriteUnlocked(all);
    });
  }

  async update(id: ExperimentId, updates: Partial<Omit<ExperimentRecord, "id">>): Promise<void> {
    await withFileLock(this.lockPath(), async () => {
      const all = await this.readAllUnlocked();
      const idx = all.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`Experiment not found: ${id}`);
      all[idx] = { ...all[idx], ...updates, id };
      await this.rewriteUnlocked(all);
    });
  }
}
