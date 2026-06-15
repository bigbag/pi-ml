import type { SearchSource } from "./source-interface.js";
import type { SearchResult, EnrichedSearchResult, SearchOptions } from "../search-types.js";

const HF_API = "https://huggingface.co/api";

interface HfModel {
  modelId?: string;
  id?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  pipeline_tag?: string;
  library_name?: string;
  author?: string;
  lastModified?: string;
  safetensors?: { total?: number; parameters?: Record<string, number> };
}

interface HfDataset {
  id?: string;
  downloads?: number;
  likes?: number;
  tags?: string[];
  description?: string;
  author?: string;
  lastModified?: string;
}

export class HuggingFaceSource implements SearchSource {
  name = "huggingface";

  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const half = Math.ceil(maxResults / 2);

    const [models, datasets] = await Promise.all([
      this.searchModels(query, half),
      this.searchDatasets(query, half),
    ]);

    const merged = [...models, ...datasets];
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, maxResults);
  }

  async fetchDetails(id: string): Promise<EnrichedSearchResult | null> {
    // Try model first, fallback to dataset
    const model = await this.fetchModel(id);
    if (model) return model;

    const dataset = await this.fetchDataset(id);
    return dataset;
  }

  private async searchModels(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const url = `${HF_API}/models?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data: HfModel[] = (await res.json()) as HfModel[];
      return data.map((m) => {
        const modelId = m.modelId ?? m.id ?? "";
        const downloads = m.downloads ?? 0;
        const snippetParts: string[] = [];
        if (m.pipeline_tag) snippetParts.push(m.pipeline_tag);
        if (m.tags?.length) snippetParts.push(m.tags.slice(0, 5).join(", "));
        return {
          id: modelId,
          title: modelId,
          url: `https://huggingface.co/${modelId}`,
          source: "huggingface",
          snippet: snippetParts.join(" | ") || "HuggingFace model",
          publishedAt: m.lastModified,
          score: this.computeScore(downloads),
        };
      });
    } catch {
      return [];
    }
  }

  private async searchDatasets(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const url = `${HF_API}/datasets?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];

      const data: HfDataset[] = (await res.json()) as HfDataset[];
      return data.map((d) => {
        const datasetId = d.id ?? "";
        const downloads = d.downloads ?? 0;
        const snippetParts: string[] = [];
        if (d.description) snippetParts.push(d.description.slice(0, 200));
        else if (d.tags?.length) snippetParts.push(d.tags.slice(0, 5).join(", "));
        return {
          id: datasetId,
          title: datasetId,
          url: `https://huggingface.co/datasets/${datasetId}`,
          source: "huggingface",
          snippet: snippetParts.join(" | ") || "HuggingFace dataset",
          publishedAt: d.lastModified,
          score: this.computeScore(downloads),
        };
      });
    } catch {
      return [];
    }
  }

  private async fetchModel(id: string): Promise<EnrichedSearchResult | null> {
    try {
      const res = await fetch(`${HF_API}/models/${id}`);
      if (!res.ok) return null;

      const m: HfModel = (await res.json()) as HfModel;
      const modelId = m.modelId ?? m.id ?? id;
      const downloads = m.downloads ?? 0;
      const tags = m.tags ?? [];

      const license = tags.find((t) => t.startsWith("license:"))?.replace("license:", "") ?? undefined;
      const frameworks: string[] = [];
      if (m.library_name) frameworks.push(m.library_name);
      for (const tag of tags) {
        if (
          tag.startsWith("pytorch") ||
          tag.startsWith("tensorflow") ||
          tag.startsWith("jax") ||
          tag.startsWith("onnx") ||
          tag.startsWith("safetensors")
        ) {
          if (!frameworks.includes(tag)) frameworks.push(tag);
        }
      }

      const techniques: string[] = [];
      if (m.pipeline_tag) techniques.push(m.pipeline_tag);

      const modelSize = this.extractModelSize(m);

      const snippetParts: string[] = [];
      if (m.pipeline_tag) snippetParts.push(m.pipeline_tag);
      if (tags.length) snippetParts.push(tags.slice(0, 5).join(", "));

      return {
        id: modelId,
        title: modelId,
        url: `https://huggingface.co/${modelId}`,
        source: "huggingface",
        snippet: snippetParts.join(" | ") || "HuggingFace model",
        publishedAt: m.lastModified,
        score: this.computeScore(downloads),
        resultType: "model",
        stars: m.likes,
        license,
        frameworks: frameworks.length ? frameworks : undefined,
        techniques: techniques.length ? techniques : undefined,
        modelSize,
        authors: m.author ? [m.author] : undefined,
      };
    } catch {
      return null;
    }
  }

  private async fetchDataset(id: string): Promise<EnrichedSearchResult | null> {
    try {
      const res = await fetch(`${HF_API}/datasets/${id}`);
      if (!res.ok) return null;

      const d: HfDataset = (await res.json()) as HfDataset;
      const datasetId = d.id ?? id;
      const downloads = d.downloads ?? 0;
      const tags = d.tags ?? [];

      const license = tags.find((t) => t.startsWith("license:"))?.replace("license:", "") ?? undefined;

      const snippetParts: string[] = [];
      if (d.description) snippetParts.push(d.description.slice(0, 200));
      else if (tags.length) snippetParts.push(tags.slice(0, 5).join(", "));

      return {
        id: datasetId,
        title: datasetId,
        url: `https://huggingface.co/datasets/${datasetId}`,
        source: "huggingface",
        snippet: snippetParts.join(" | ") || "HuggingFace dataset",
        publishedAt: d.lastModified,
        score: this.computeScore(downloads),
        resultType: "dataset",
        stars: d.likes,
        license,
        datasets: [datasetId],
      };
    } catch {
      return null;
    }
  }

  private computeScore(downloads: number): number {
    return Math.min(Math.log10(downloads + 1) / 7, 1);
  }

  private extractModelSize(m: HfModel): string | undefined {
    // Try safetensors metadata first
    if (m.safetensors) {
      const total = m.safetensors.total;
      if (total) return this.formatParams(total);
      const params = m.safetensors.parameters;
      if (params) {
        const sum = Object.values(params).reduce((acc, v) => acc + v, 0);
        if (sum > 0) return this.formatParams(sum);
      }
    }

    // Fallback: look for size hints in tags
    const tags = m.tags ?? [];
    for (const tag of tags) {
      const sizeMatch = tag.match(/^(\d+(\.\d+)?)[bB]$/);
      if (sizeMatch) return `${sizeMatch[1]}B`;
    }

    return undefined;
  }

  private formatParams(n: number): string {
    if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
    return `${n}`;
  }
}
