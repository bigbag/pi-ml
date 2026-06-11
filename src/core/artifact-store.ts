import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { ArtifactId, ArtifactMetadata, ArtifactFilter, ArtifactType, ExperimentId } from "./artifact-types.js";

function computeChecksum(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export class ArtifactStore {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private metaPath(id: ArtifactId): string {
    return path.join(this.baseDir, `${id}.meta.json`);
  }

  private dataPath(id: ArtifactId): string {
    return path.join(this.baseDir, `${id}.bin`);
  }

  async store(
    experimentId: ExperimentId,
    type: ArtifactType,
    name: string,
    data: Buffer | string,
  ): Promise<ArtifactMetadata> {
    const id = `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf-8");
    const meta: ArtifactMetadata = {
      id,
      experimentId,
      type,
      name,
      createdAt: Date.now(),
      size: buf.length,
      checksum: computeChecksum(buf),
      tags: [],
      source: "store",
      dependencies: [],
    };
    await fs.mkdir(this.baseDir, { recursive: true });
    await fs.writeFile(this.metaPath(id), JSON.stringify(meta, null, 2));
    await fs.writeFile(this.dataPath(id), buf);
    return meta;
  }

  async retrieve(id: ArtifactId): Promise<Buffer> {
    return fs.readFile(this.dataPath(id));
  }

  async retrieveMeta(id: ArtifactId): Promise<ArtifactMetadata> {
    const raw = await fs.readFile(this.metaPath(id), "utf-8");
    return JSON.parse(raw) as ArtifactMetadata;
  }

  async list(filter?: ArtifactFilter): Promise<ArtifactMetadata[]> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const entries = await fs.readdir(this.baseDir);
    const metaFiles = entries.filter((e) => e.endsWith(".meta.json"));
    const metas: ArtifactMetadata[] = [];
    for (const f of metaFiles) {
      const raw = await fs.readFile(path.join(this.baseDir, f), "utf-8");
      try {
        const m = JSON.parse(raw) as ArtifactMetadata;
        if (filter?.experimentId && m.experimentId !== filter.experimentId) continue;
        if (filter?.type && m.type !== filter.type) continue;
        if (filter?.tags && filter.tags.length > 0) {
          if (!filter.tags.some((t) => m.tags.includes(t))) continue;
        }
        if (filter?.after && m.createdAt < filter.after) continue;
        if (filter?.before && m.createdAt > filter.before) continue;
        metas.push(m);
      } catch {
        // skip corrupt meta files
      }
    }
    return metas.sort((a, b) => a.createdAt - b.createdAt);
  }

  async exists(id: ArtifactId): Promise<boolean> {
    try {
      await fs.access(this.metaPath(id));
      return true;
    } catch {
      return false;
    }
  }
}
