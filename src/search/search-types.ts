export interface SearchResult {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt?: string;
  score: number;
}

export interface SearchOptions {
  sources?: string[];
  maxResults?: number;
  recencyBias?: boolean;
  timeRange?: { from?: Date; to?: Date };
}
