import type { SearchSource } from "./source-interface.js";
import type { SearchResult, SearchOptions } from "../search-types.js";

export class WebSource implements SearchSource {
  name = "web";

  async search(query: string, _options?: SearchOptions): Promise<SearchResult[]> {
    void query;
    return [];
  }
}
