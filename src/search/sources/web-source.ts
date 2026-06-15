import type { SearchSource } from "./source-interface.js";
import type { SearchResult, SearchOptions } from "../search-types.js";

interface SearxngResult {
  title: string;
  url: string;
  content: string;
  publishedDate?: string;
}

interface DuckDuckGoResponse {
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
}

export class WebSource implements SearchSource {
  name = "web";
  private searxngUrl: string;

  constructor(searxngUrl?: string) {
    this.searxngUrl = searxngUrl ?? "http://localhost:8888";
  }

  async search(query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    try {
      return await this.searchSearxng(query);
    } catch {
      try {
        return await this.searchDuckDuckGo(query);
      } catch {
        return [];
      }
    }
  }

  private async searchSearxng(query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      categories: "science,it",
    });

    const url = `${this.searxngUrl}/search?${params.toString()}`;
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`SearxNG returned ${response.status}`);
    }

    const data = (await response.json()) as { results?: SearxngResult[] };
    const results: SearxngResult[] = data.results ?? [];

    return results.map((item, index) => ({
      id: `web-searxng-${index}-${Date.now()}`,
      title: item.title ?? "",
      url: item.url ?? "",
      source: "web",
      snippet: item.content ?? "",
      publishedAt: item.publishedDate ?? undefined,
      score: 1,
    }));
  }

  private async searchDuckDuckGo(query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      no_html: "1",
      skip_disambig: "1",
    });

    const url = `https://api.duckduckgo.com/?${params.toString()}`;
    const response = await this.fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned ${response.status}`);
    }

    const data = (await response.json()) as DuckDuckGoResponse;
    const results: SearchResult[] = [];

    if (data.AbstractText && data.AbstractURL) {
      results.push({
        id: `web-ddg-abstract-${Date.now()}`,
        title: query,
        url: data.AbstractURL,
        source: "web",
        snippet: data.AbstractText,
        score: 1,
      });
    }

    if (data.RelatedTopics) {
      for (let i = 0; i < data.RelatedTopics.length; i++) {
        const topic = data.RelatedTopics[i];
        if (topic.Text && topic.FirstURL) {
          results.push({
            id: `web-ddg-topic-${i}-${Date.now()}`,
            title: topic.Text.slice(0, 100),
            url: topic.FirstURL,
            source: "web",
            snippet: topic.Text,
            score: 1,
          });
        }
      }
    }

    return results;
  }

  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
