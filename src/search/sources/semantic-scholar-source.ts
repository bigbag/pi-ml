import type { SearchSource } from "./source-interface.js";
import type { SearchResult, EnrichedSearchResult, SearchOptions } from "../search-types.js";

const BASE_URL = "https://api.semanticscholar.org/graph/v1";

interface S2Author {
  authorId: string;
  name: string;
}

interface S2Paper {
  paperId: string;
  title: string;
  abstract?: string;
  citationCount?: number;
  year?: number;
  authors?: S2Author[];
  externalIds?: Record<string, string>;
  openAccessPdf?: { url: string };
  tldr?: { text: string };
  fieldsOfStudy?: string[];
  venue?: string;
}

interface S2SearchResponse {
  total: number;
  data?: S2Paper[];
}

export class SemanticScholarSource implements SearchSource {
  name = "semantic-scholar";
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const limit = options?.maxResults ?? 10;
    const url = new URL(`${BASE_URL}/paper/search`);
    url.searchParams.set("query", query);
    url.searchParams.set(
      "fields",
      "title,abstract,citationCount,year,authors,externalIds,openAccessPdf,tldr",
    );
    url.searchParams.set("limit", String(limit));

    try {
      const data = await this.fetchWithRetry<S2SearchResponse>(url.toString());
      if (!data?.data) return [];

      return data.data.map((paper) => this.mapToSearchResult(paper));
    } catch {
      return [];
    }
  }

  async fetchDetails(id: string): Promise<EnrichedSearchResult | null> {
    const url = new URL(`${BASE_URL}/paper/${encodeURIComponent(id)}`);
    url.searchParams.set(
      "fields",
      "title,abstract,citationCount,year,authors,externalIds,openAccessPdf,tldr,fieldsOfStudy,venue",
    );

    try {
      const paper = await this.fetchWithRetry<S2Paper>(url.toString());
      if (!paper) return null;

      return this.mapToEnrichedResult(paper);
    } catch {
      return null;
    }
  }

  private mapToSearchResult(paper: S2Paper): SearchResult {
    const snippet =
      paper.tldr?.text ?? (paper.abstract ? paper.abstract.slice(0, 300) : "");
    const citations = paper.citationCount ?? 0;

    return {
      id: paper.paperId,
      title: paper.title,
      url: this.buildPaperUrl(paper),
      source: "semantic-scholar",
      snippet,
      publishedAt: paper.year ? `${paper.year}` : undefined,
      score: this.normalizeScore(citations),
    };
  }

  private mapToEnrichedResult(paper: S2Paper): EnrichedSearchResult {
    const base = this.mapToSearchResult(paper);
    const paperUrl =
      paper.openAccessPdf?.url ?? this.buildArxivPdfUrl(paper.externalIds);

    return {
      ...base,
      authors: paper.authors?.map((a) => a.name),
      citations: paper.citationCount ?? 0,
      techniques: paper.fieldsOfStudy ?? undefined,
      paperUrl: paperUrl ?? undefined,
      resultType: "paper",
    };
  }

  private buildPaperUrl(paper: S2Paper): string {
    if (paper.externalIds?.ArXiv) {
      return `https://arxiv.org/abs/${paper.externalIds.ArXiv}`;
    }
    if (paper.externalIds?.DOI) {
      return `https://doi.org/${paper.externalIds.DOI}`;
    }
    return `https://www.semanticscholar.org/paper/${paper.paperId}`;
  }

  private buildArxivPdfUrl(
    externalIds?: Record<string, string>,
  ): string | undefined {
    if (externalIds?.ArXiv) {
      return `https://arxiv.org/pdf/${externalIds.ArXiv}`;
    }
    return undefined;
  }

  private normalizeScore(citations: number): number {
    return Math.min(Math.log10(citations + 1) / 5, 1);
  }

  private async fetchWithRetry<T>(url: string): Promise<T | null> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    let res = await fetch(url, { headers });

    if (res.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res = await fetch(url, { headers });
    }

    if (!res.ok) return null;

    return (await res.json()) as T;
  }
}
