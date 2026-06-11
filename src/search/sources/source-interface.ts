import type { SearchResult, SearchOptions } from "../search-types.js";

export interface SearchSource {
  name: string;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
}
