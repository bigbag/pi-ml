export interface SearchResult {
  id: string;
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt?: string;
  score: number;
}

export type ResultType = "paper" | "repo" | "dataset" | "model" | "discussion" | "leaderboard";

export interface EnrichedSearchResult extends SearchResult {
  authors?: string[];
  citations?: number;
  stars?: number;
  language?: string;
  license?: string;

  techniques?: string[];
  metrics?: Record<string, number>;
  datasets?: string[];
  frameworks?: string[];
  modelSize?: string;

  codeUrl?: string;
  paperUrl?: string;
  resultType: ResultType;
}

export interface SearchContext {
  taskType?: string;
  metric?: string;
  dataset?: string;
  constraints?: Record<string, string>;
  currentBaseline?: Record<string, number>;
  deadEnds?: string[];
  workingTechniques?: string[];
}

export interface SearchOptions {
  sources?: string[];
  maxResults?: number;
  recencyBias?: boolean;
  timeRange?: { from?: Date; to?: Date };
  context?: SearchContext;
}
