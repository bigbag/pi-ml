import type { SearchSource } from "./source-interface.js";
import type { SearchResult, SearchOptions } from "../../types/search.js";

export class ArxivSource implements SearchSource {
  name = "arxiv";

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const url = new URL("http://export.arxiv.org/api/query");
    url.searchParams.set("search_query", `all:${query}`);
    url.searchParams.set("start", "0");
    url.searchParams.set("max_results", String(options?.maxResults ?? 10));
    url.searchParams.set("sortBy", options?.recencyBias ? "submittedDate" : "relevance");
    url.searchParams.set("sortOrder", "descending");

    const res = await fetch(url.toString());
    const text = await res.text();
    return this.parseFeed(text);
  }

  private parseFeed(xml: string): SearchResult[] {
    const entries: SearchResult[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let m: RegExpExecArray | null;
    while ((m = entryRegex.exec(xml)) !== null) {
      const entryXml = m[1];
      const idMatch = entryXml.match(/<id>(.*?)<\/id>/);
      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
      if (idMatch && titleMatch) {
        entries.push({
          id: idMatch[1],
          title: titleMatch[1].replace(/\s+/g, " ").trim(),
          url: idMatch[1],
          source: "arxiv",
          snippet: summaryMatch ? summaryMatch[1].replace(/\s+/g, " ").trim().slice(0, 300) : "",
          publishedAt: publishedMatch ? publishedMatch[1] : undefined,
          score: 1,
        });
      }
    }
    return entries;
  }
}
