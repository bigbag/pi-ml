import * as crypto from "node:crypto";
import type { SearchSource } from "./sources/source-interface.js";
import type { SearchResult, SearchOptions } from "./search-types.js";
import { SearchCache } from "./search-cache.js";

export class DeepSearch {
  private readonly sources: SearchSource[];
  private readonly cache: SearchCache;

  constructor(sources: SearchSource[], cacheDir: string) {
    this.sources = sources;
    this.cache = new SearchCache(cacheDir);
  }

  private hashQuery(query: string): string {
    return crypto.createHash("sha256").update(query).digest("hex").slice(0, 16);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const queryHash = this.hashQuery(query);
    const sourceNames = options?.sources ?? this.sources.map((s) => s.name);
    const activeSources = this.sources.filter((s) => sourceNames.includes(s.name));

    const allResults: SearchResult[] = [];
    for (const source of activeSources) {
      const cached = await this.cache.get(queryHash, source.name);
      if (cached) {
        allResults.push(...cached);
        continue;
      }
      try {
        const results = await source.search(query, options);
        await this.cache.set(queryHash, source.name, results);
        allResults.push(...results);
      } catch (err) {
        console.warn(`Search failed for source ${source.name}:`, err);
      }
    }

    const deduped = this.deduplicate(allResults);
    const max = options?.maxResults ?? 20;
    return deduped.slice(0, max);
  }

  private deduplicate(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.url || r.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async clearCache(queryHash?: string): Promise<void> {
    await this.cache.clear(queryHash);
  }
}
