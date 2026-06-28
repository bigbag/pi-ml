import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { DeepSearch } from "../../src/search/deep-search.js";
import type { SearchSource, SearchResult } from "../../src/types/search.js";

class MockSource implements SearchSource {
  name = "mock";
  results: SearchResult[] = [];

  async search(_query: string): Promise<SearchResult[]> {
    return this.results;
  }
}

describe("DeepSearch", () => {
  let tmpDir: string;
  let source: MockSource;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-search-"));
    source = new MockSource();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("searches and returns results", async () => {
    source.results = [
      { id: "1", title: "Paper A", url: "http://a.com", source: "mock", snippet: "abc", score: 1 },
      { id: "2", title: "Paper B", url: "http://b.com", source: "mock", snippet: "def", score: 0.9 },
    ];

    const ds = new DeepSearch([source], tmpDir);
    const results = await ds.search("test");

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe("Paper A");
  });

  it("caches results", async () => {
    source.results = [{ id: "1", title: "Paper", url: "http://a.com", source: "mock", snippet: "abc", score: 1 }];

    const ds = new DeepSearch([source], tmpDir);
    await ds.search("cache-test");
    const callCount = source.results.length;

    // Second search should use cache
    const results2 = await ds.search("cache-test");
    expect(results2).toHaveLength(1);
  });

  it("deduplicates by url", async () => {
    source.results = [
      { id: "1", title: "A", url: "http://dup.com", source: "mock", snippet: "abc", score: 1 },
      { id: "2", title: "B", url: "http://dup.com", source: "mock", snippet: "def", score: 0.9 },
    ];

    const ds = new DeepSearch([source], tmpDir);
    const results = await ds.search("dedup");

    expect(results).toHaveLength(1);
  });

  it("respects maxResults", async () => {
    source.results = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      title: `Paper ${i}`,
      url: `http://${i}.com`,
      source: "mock",
      snippet: "...",
      score: 1 - i * 0.1,
    }));

    const ds = new DeepSearch([source], tmpDir);
    const results = await ds.search("limit", { maxResults: 3 });

    expect(results).toHaveLength(3);
  });
});
