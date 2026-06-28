import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import type { SearchResult } from "../types/search.js";

function hashKey(queryHash: string, source: string): string {
  return crypto.createHash("sha256").update(`${queryHash}:${source}`).digest("hex").slice(0, 16);
}

export class SearchCache {
  private readonly baseDir: string;
  private readonly ttlMs: number;

  constructor(baseDir: string, ttlMs = 24 * 60 * 60 * 1000) {
    this.baseDir = baseDir;
    this.ttlMs = ttlMs;
  }

  private cachePath(key: string): string {
    return path.join(this.baseDir, `${key}.json`);
  }

  async get(queryHash: string, source: string): Promise<SearchResult[] | undefined> {
    const key = hashKey(queryHash, source);
    const filePath = this.cachePath(key);
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw) as { cachedAt: number; results: SearchResult[] };
      if (Date.now() - parsed.cachedAt > this.ttlMs) {
        await fs.unlink(filePath);
        return undefined;
      }
      return parsed.results;
    } catch {
      return undefined;
    }
  }

  async set(queryHash: string, source: string, results: SearchResult[]): Promise<void> {
    const key = hashKey(queryHash, source);
    await fs.mkdir(this.baseDir, { recursive: true });
    const payload = { cachedAt: Date.now(), results };
    await fs.writeFile(this.cachePath(key), JSON.stringify(payload, null, 2));
  }

  async clear(queryHash?: string): Promise<void> {
    if (queryHash) {
      for (const source of ["arxiv", "web", "github", "pwc", "kaggle"]) {
        const key = hashKey(queryHash, source);
        try {
          await fs.unlink(this.cachePath(key));
        } catch {
          // ignore
        }
      }
    } else {
      await fs.rm(this.baseDir, { recursive: true, force: true });
    }
  }
}
