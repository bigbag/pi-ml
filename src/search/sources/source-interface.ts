import type { SearchResult, EnrichedSearchResult, SearchOptions } from "../../types/search.js";

export interface SearchSource {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  fetchDetails?(id: string): Promise<EnrichedSearchResult | null>;
}
