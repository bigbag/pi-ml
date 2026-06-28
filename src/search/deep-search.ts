import * as crypto from "node:crypto";
import type { SearchSource } from "./sources/source-interface.js";
import type { SearchResult, EnrichedSearchResult, SearchOptions, SearchContext } from "../types/search.js";
import { SearchCache } from "./search-cache.js";
import { scoreResults } from "./result-scorer.js";

export class DeepSearch {
  private readonly sources: SearchSource[];
  private readonly cache: SearchCache;
  private context?: SearchContext;

  constructor(sources: SearchSource[], cacheDir: string, cacheTtlMs?: number) {
    this.sources = sources;
    this.cache = new SearchCache(cacheDir, cacheTtlMs);
  }

  setContext(context: SearchContext): void {
    this.context = context;
  }

  getContext(): SearchContext | undefined {
    return this.context;
  }

  private hashQuery(query: string): string {
    return crypto.createHash("sha256").update(query).digest("hex").slice(0, 16);
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const queryHash = this.hashQuery(query);
    const sourceNames = options?.sources ?? this.sources.map((s) => s.name);
    const activeSources = this.sources.filter((s) => sourceNames.includes(s.name));

    const results = await Promise.allSettled(
      activeSources.map(async (source) => {
        const cached = await this.cache.get(queryHash, source.name);
        if (cached) return cached;
        const fresh = await source.search(query, options);
        await this.cache.set(queryHash, source.name, fresh);
        return fresh;
      }),
    );

    const allResults: SearchResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      }
    }

    const deduped = this.deduplicate(allResults);
    const ctx = options?.context ?? this.context;
    const scored = scoreResults(deduped, ctx);
    const max = options?.maxResults ?? 20;
    return scored.slice(0, max);
  }

  async fetchDetails(id: string, sourceName?: string): Promise<EnrichedSearchResult | null> {
    const targets = sourceName
      ? this.sources.filter((s) => s.name === sourceName)
      : this.sources;

    for (const source of targets) {
      if (source.fetchDetails) {
        try {
          const details = await source.fetchDetails(id);
          if (details) return details;
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  private deduplicate(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const keys = [r.url || r.id];
      const arxivMatch = r.url?.match(/arxiv\.org\/abs\/(\d+\.\d+)/);
      if (arxivMatch) keys.push(`arxiv:${arxivMatch[1]}`);
      const titleKey = r.title.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
      if (titleKey.length > 30) keys.push(`title:${titleKey}`);

      for (const key of keys) {
        if (seen.has(key)) return false;
      }
      for (const key of keys) {
        seen.add(key);
      }
      return true;
    });
  }

  async clearCache(queryHash?: string): Promise<void> {
    await this.cache.clear(queryHash);
  }
}
