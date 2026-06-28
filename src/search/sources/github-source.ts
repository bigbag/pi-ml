import type { SearchSource } from "./source-interface.js";
import type { SearchResult, EnrichedSearchResult, SearchOptions } from "../../types/search.js";

const KNOWN_FRAMEWORKS = new Set([
  "pytorch",
  "tensorflow",
  "jax",
  "keras",
  "scikit-learn",
  "huggingface",
]);

const KNOWN_TECHNIQUES = new Set([
  "quantization",
  "pruning",
  "distillation",
  "fine-tuning",
  "finetuning",
  "transfer-learning",
  "data-augmentation",
  "self-supervised",
  "contrastive-learning",
  "knowledge-distillation",
  "mixed-precision",
  "gradient-checkpointing",
  "lora",
  "qlora",
  "rlhf",
  "dpo",
  "reinforcement-learning",
  "federated-learning",
  "neural-architecture-search",
  "ensemble",
  "curriculum-learning",
  "meta-learning",
  "few-shot",
  "zero-shot",
]);

interface GithubRepo {
  full_name: string;
  html_url: string;
  description?: string;
  created_at?: string;
  stargazers_count?: number;
  language?: string;
  license?: { spdx_id?: string };
  topics?: string[];
}

interface GithubSearchResponse {
  items?: GithubRepo[];
}

export class GithubSource implements SearchSource {
  name = "github";
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 10;
    let q = `${query}+topic:machine-learning`;
    let sort = "stars";

    if (options?.recencyBias) {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateStr = oneYearAgo.toISOString().split("T")[0];
      q += `+pushed:>${dateStr}`;
      sort = "updated";
    }

    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${maxResults}`;

    try {
      const res = await fetch(url, { headers: this.buildHeaders() });

      if (this.isRateLimited(res)) {
        return [];
      }

      if (!res.ok) {
        return [];
      }

      const data = (await res.json()) as GithubSearchResponse;
      const items = data.items ?? [];

      return items.map((item) => ({
        id: item.full_name,
        title: item.full_name,
        url: item.html_url,
        source: "github",
        snippet: item.description ?? "",
        publishedAt: item.created_at,
        score: Math.min(Math.log10((item.stargazers_count ?? 0) + 1) / 5, 1),
      }));
    } catch {
      return [];
    }
  }

  async fetchDetails(id: string): Promise<EnrichedSearchResult | null> {
    const url = `https://api.github.com/repos/${id}`;

    try {
      const res = await fetch(url, { headers: this.buildHeaders() });

      if (this.isRateLimited(res)) {
        return null;
      }

      if (!res.ok) {
        return null;
      }

      const repo = (await res.json()) as GithubRepo;
      const topics: string[] = repo.topics ?? [];

      const frameworks = topics.filter((t) => KNOWN_FRAMEWORKS.has(t));
      const techniques = topics.filter((t) => KNOWN_TECHNIQUES.has(t));

      return {
        id: repo.full_name,
        title: repo.full_name,
        url: repo.html_url,
        source: "github",
        snippet: repo.description ?? "",
        publishedAt: repo.created_at,
        score: Math.min(Math.log10((repo.stargazers_count ?? 0) + 1) / 5, 1),
        stars: repo.stargazers_count,
        language: repo.language ?? undefined,
        license: repo.license?.spdx_id ?? undefined,
        codeUrl: repo.html_url,
        frameworks: frameworks.length > 0 ? frameworks : undefined,
        techniques: techniques.length > 0 ? techniques : undefined,
        resultType: "repo",
      };
    } catch {
      return null;
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private isRateLimited(res: Response): boolean {
    const remaining = res.headers.get("x-ratelimit-remaining");
    return remaining !== null && parseInt(remaining, 10) === 0;
  }
}
