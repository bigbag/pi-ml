import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ArtifactId, ArtifactMetadata, ArtifactFilter, ArtifactDiff, ArtifactType, ExperimentId } from "../types/artifact.js";
import { ArtifactStore } from "./artifact-store.js";

export class ArtifactRegistry {
  private readonly store: ArtifactStore;
  private readonly registryPath: string;

  constructor(baseDir: string) {
    this.store = new ArtifactStore(path.join(baseDir, "store"));
    this.registryPath = path.join(baseDir, "registry.jsonl");
  }

  private async appendRegistry(meta: ArtifactMetadata): Promise<void> {
    await fs.mkdir(path.dirname(this.registryPath), { recursive: true });
    const line = JSON.stringify(meta) + "\n";
    await fs.appendFile(this.registryPath, line);
  }

  async register(
    experimentId: ExperimentId,
    type: ArtifactType,
    name: string,
    sourcePath: string,
    options?: { tags?: string[]; source?: string; dependencies?: ArtifactId[] },
  ): Promise<ArtifactMetadata> {
    const data = await fs.readFile(sourcePath);
    const meta = await this.store.store(experimentId, type, name, data);
    if (options?.tags) meta.tags = [...options.tags];
    if (options?.source) meta.source = options.source;
    if (options?.dependencies) meta.dependencies = [...options.dependencies];
    await fs.writeFile(
      path.join((this.store as unknown as Record<string, string>).baseDir, `${meta.id}.meta.json`),
      JSON.stringify(meta, null, 2),
    );
    await this.appendRegistry(meta);
    return meta;
  }

  async read(id: ArtifactId): Promise<Buffer> {
    return this.store.retrieve(id);
  }

  async list(experimentId?: ExperimentId, type?: ArtifactType, tag?: string): Promise<ArtifactMetadata[]> {
    const filter: ArtifactFilter = {};
    if (experimentId) filter.experimentId = experimentId;
    if (type) filter.type = type;
    if (tag) filter.tags = [tag];
    return this.store.list(filter);
  }

  async get(id: ArtifactId): Promise<ArtifactMetadata | undefined> {
    if (!(await this.store.exists(id))) return undefined;
    return this.store.retrieveMeta(id);
  }

  async compare(a: ArtifactId, b: ArtifactId): Promise<ArtifactDiff> {
    const metaA = await this.get(a);
    const metaB = await this.get(b);
    if (!metaA || !metaB) {
      throw new Error("Artifact not found for comparison");
    }
    if (metaA.type !== metaB.type) {
      return { type: "binary", diffs: [], before: null, after: null };
    }
    const dataA = await this.store.retrieve(a);
    const dataB = await this.store.retrieve(b);
    if (metaA.type === "config" || metaA.type === "code" || metaA.type === "prediction" || metaA.type === "log" || metaA.type === "report") {
      const linesA = dataA.toString("utf-8").split("\n");
      const linesB = dataB.toString("utf-8").split("\n");
      const maxLen = Math.max(linesA.length, linesB.length);
      const diffs: Array<{ lineA: number; lineB: number; before: string; after: string }> = [];
      for (let i = 0; i < maxLen; i++) {
        if (linesA[i] !== linesB[i]) {
          diffs.push({ lineA: i + 1, lineB: i + 1, before: linesA[i] || "", after: linesB[i] || "" });
        }
      }
      return { type: "text", diffs, before: dataA.toString("utf-8"), after: dataB.toString("utf-8") };
    }
    return { type: "binary", diffs: [], before: null, after: null };
  }

  async addTag(id: ArtifactId, tag: string): Promise<void> {
    const meta = await this.get(id);
    if (!meta) throw new Error(`Artifact not found: ${id}`);
    if (!meta.tags.includes(tag)) meta.tags.push(tag);
    const baseDir = (this.store as unknown as Record<string, string>).baseDir;
    await fs.writeFile(path.join(baseDir, `${id}.meta.json`), JSON.stringify(meta, null, 2));
  }

  async removeTag(id: ArtifactId, tag: string): Promise<void> {
    const meta = await this.get(id);
    if (!meta) throw new Error(`Artifact not found: ${id}`);
    meta.tags = meta.tags.filter((t) => t !== tag);
    const baseDir = (this.store as unknown as Record<string, string>).baseDir;
    await fs.writeFile(path.join(baseDir, `${id}.meta.json`), JSON.stringify(meta, null, 2));
  }

  async tag(id: ArtifactId, tags: string[]): Promise<void> {
    const meta = await this.get(id);
    if (!meta) throw new Error(`Artifact not found: ${id}`);
    for (const t of tags) {
      if (!meta.tags.includes(t)) meta.tags.push(t);
    }
    const baseDir = (this.store as unknown as Record<string, string>).baseDir;
    await fs.writeFile(
      path.join(baseDir, `${id}.meta.json`),
      JSON.stringify(meta, null, 2),
    );
  }

  async export(id: ArtifactId, destPath: string): Promise<void> {
    const data = await this.store.retrieve(id);
    await fs.writeFile(destPath, data);
  }

  async exists(id: ArtifactId): Promise<boolean> {
    return this.store.exists(id);
  }
}
