import type { SearchSource } from "./source-interface.js";
import type { SearchResult, EnrichedSearchResult, SearchOptions } from "../../types/search.js";

const BASE_URL = "https://paperswithcode.com/api/v1";

interface PwcPaper {
  id?: string;
  title?: string;
  abstract?: string;
  url_abs?: string;
  url_pdf?: string;
  published?: string;
  authors?: Array<string | { name?: string }>;
}

interface PwcSearchItem {
  paper?: PwcPaper;
}

interface PwcRepo {
  url?: string;
  stars?: number;
  framework?: string;
}

interface PwcBenchmarkResult {
  task?: string;
  dataset?: string;
  metrics?: Record<string, number>;
}

interface PwcListResponse<T> {
  results?: T[];
}

export class PwcSource implements SearchSource {
  name = "pwc";

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
      const maxResults = options?.maxResults ?? 10;
      const url = new URL(`${BASE_URL}/search/`);
      url.searchParams.set("q", query);
      url.searchParams.set("page", "1");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as PwcListResponse<PwcSearchItem>;
      const results: SearchResult[] = [];

      const items = data?.results ?? [];
      for (const item of items.slice(0, maxResults)) {
        const paper = item?.paper;
        if (!paper) continue;

        const id = paper.id ?? paper.url_abs ?? "";
        const title = paper.title ?? "";
        const abstract = paper.abstract ?? "";

        results.push({
          id: String(id),
          title,
          url: paper.url_abs ?? `https://paperswithcode.com/paper/${id}`,
          source: "pwc",
          snippet: abstract.slice(0, 300),
          publishedAt: paper.published ?? undefined,
          score: 1,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  async fetchDetails(id: string): Promise<EnrichedSearchResult | null> {
    try {
      const [paperRes, reposRes, resultsRes] = await Promise.all([
        fetch(`${BASE_URL}/papers/${id}/`, {
          headers: { Accept: "application/json" },
        }),
        fetch(`${BASE_URL}/papers/${id}/repositories/`, {
          headers: { Accept: "application/json" },
        }),
        fetch(`${BASE_URL}/papers/${id}/results/`, {
          headers: { Accept: "application/json" },
        }),
      ]);

      if (!paperRes.ok) {
        return null;
      }

      const paper = (await paperRes.json()) as PwcPaper;

      const repos = reposRes.ok
        ? ((await reposRes.json()) as PwcListResponse<PwcRepo>)
        : { results: [] as PwcRepo[] };
      const benchmarks = resultsRes.ok
        ? ((await resultsRes.json()) as PwcListResponse<PwcBenchmarkResult>)
        : { results: [] as PwcBenchmarkResult[] };

      const repoList = repos?.results ?? [];
      const benchmarkList = benchmarks?.results ?? [];

      // Extract the top repo by stars
      const topRepo = repoList.length > 0
        ? repoList.reduce((best, r) =>
            (r.stars ?? 0) > (best.stars ?? 0) ? r : best, repoList[0])
        : null;

      // Extract frameworks from repos
      const frameworks = [...new Set(
        repoList
          .map((r) => r.framework)
          .filter((f): f is string => typeof f === "string" && f.length > 0),
      )];

      // Extract datasets and metrics from benchmark results
      const datasets: string[] = [];
      const metrics: Record<string, number> = {};

      for (const result of benchmarkList) {
        if (result.dataset && !datasets.includes(result.dataset)) {
          datasets.push(result.dataset);
        }
        const resultMetrics = result.metrics ?? {};
        for (const [key, value] of Object.entries(resultMetrics)) {
          if (typeof value === "number") {
            metrics[key] = value;
          }
        }
      }

      // Extract authors
      const authors: string[] = Array.isArray(paper.authors)
        ? paper.authors
            .map((a) => (typeof a === "string" ? a : a?.name ?? ""))
            .filter((name) => name.length > 0)
        : [];

      const abstract = paper.abstract ?? "";

      return {
        id: String(paper.id ?? id),
        title: paper.title ?? "",
        url: paper.url_abs ?? `https://paperswithcode.com/paper/${id}`,
        source: "pwc",
        snippet: abstract.slice(0, 300),
        publishedAt: paper.published ?? undefined,
        score: 1,
        resultType: "paper",
        authors: authors.length > 0 ? authors : undefined,
        stars: topRepo?.stars ?? undefined,
        codeUrl: topRepo?.url ?? undefined,
        paperUrl: paper.url_pdf ?? paper.url_abs ?? undefined,
        frameworks: frameworks.length > 0 ? frameworks : undefined,
        datasets: datasets.length > 0 ? datasets : undefined,
        metrics: Object.keys(metrics).length > 0 ? metrics : undefined,
      };
    } catch {
      return null;
    }
  }
}
