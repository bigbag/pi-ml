import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types/settings.js";
import type { EnrichedSearchResult } from "../types/search.js";

function isEnriched(r: unknown): r is EnrichedSearchResult {
  return typeof r === "object" && r !== null && "resultType" in r;
}

function formatResults(results: Array<import("../types/search.js").SearchResult>): string {
  if (results.length === 0) return "No results found.";

  const papers = results.filter((r) => isEnriched(r) && r.resultType === "paper");
  const repos = results.filter((r) => isEnriched(r) && r.resultType === "repo");
  const models = results.filter((r) => isEnriched(r) && (r.resultType === "model" || r.resultType === "dataset"));
  const other = results.filter((r) => !isEnriched(r) || !["paper", "repo", "model", "dataset"].includes(r.resultType));

  const sections: string[] = [];

  if (papers.length > 0) {
    sections.push("PAPERS:");
    for (const [i, r] of papers.entries()) {
      const e = r as EnrichedSearchResult;
      let line = `[${i + 1}] ${r.title}`;
      if (r.publishedAt) line += ` (${r.publishedAt.slice(0, 4)})`;
      line += `\n    Source: ${r.source}`;
      if (e.citations) line += ` | Citations: ${e.citations}`;
      if (e.codeUrl) line += ` | Code: ${e.codeUrl}`;
      line += `\n    URL: ${r.url}`;
      if (e.techniques?.length) line += `\n    Techniques: ${e.techniques.join(", ")}`;
      if (e.metrics && Object.keys(e.metrics).length > 0) {
        const metricStr = Object.entries(e.metrics).map(([k, v]) => `${k}=${v}`).join(", ");
        line += `\n    Metrics: ${metricStr}`;
      }
      line += `\n    ${r.snippet}`;
      sections.push(line);
    }
  }

  if (repos.length > 0) {
    sections.push("\nCODE:");
    for (const [i, r] of repos.entries()) {
      const e = r as EnrichedSearchResult;
      let line = `[${i + 1}] ${r.title}`;
      if (e.language) line += ` (${e.language})`;
      if (e.stars) line += ` ★ ${e.stars >= 1000 ? `${(e.stars / 1000).toFixed(1)}k` : e.stars}`;
      line += `\n    ${r.url}`;
      if (e.frameworks?.length) line += ` | Framework: ${e.frameworks.join(", ")}`;
      if (e.license) line += ` | License: ${e.license}`;
      if (e.techniques?.length) line += `\n    Techniques: ${e.techniques.join(", ")}`;
      line += `\n    ${r.snippet}`;
      sections.push(line);
    }
  }

  if (models.length > 0) {
    sections.push("\nMODELS/DATASETS:");
    for (const [i, r] of models.entries()) {
      const e = r as EnrichedSearchResult;
      let line = `[${i + 1}] ${r.title}`;
      if (e.modelSize) line += ` (${e.modelSize})`;
      if (e.resultType === "dataset") line += " [dataset]";
      line += `\n    ${r.url}`;
      if (e.frameworks?.length) line += ` | Framework: ${e.frameworks.join(", ")}`;
      line += `\n    ${r.snippet}`;
      sections.push(line);
    }
  }

  if (other.length > 0) {
    sections.push("\nWEB:");
    for (const [i, r] of other.entries()) {
      sections.push(`[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.snippet}`);
    }
  }

  const sourceSummary = [...new Set(results.map((r) => r.source))].join(", ");
  return `Found ${results.length} results across ${sourceSummary}.\n\n${sections.join("\n\n")}`;
}

export function registerSearchTools(pi: ExtensionAPI, getState: (ctx: any) => SessionState) {
  pi.registerTool({
    name: "ml_search",
    label: "ML Search",
    description: "Search across ArXiv, PapersWithCode, Semantic Scholar, GitHub, HuggingFace, and web for ML research, code, and models.",
    promptSnippet: "Search papers, code, models, and benchmarks",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      sources: Type.Optional(Type.Array(Type.String(), { description: "Sources: arxiv, pwc, semantic-scholar, github, huggingface, web. Default: all" })),
      maxResults: Type.Optional(Type.Number({ default: 10, description: "Maximum results" })),
      taskType: Type.Optional(Type.String({ description: "Task type for context: classification, regression, generation, etc." })),
      metric: Type.Optional(Type.String({ description: "Metric being optimized" })),
      dataset: Type.Optional(Type.String({ description: "Dataset being used" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      if (params.taskType || params.metric || params.dataset) {
        state.deepSearch.setContext({
          taskType: params.taskType,
          metric: params.metric,
          dataset: params.dataset,
        });
      }
      const results = await state.deepSearch.search(params.query, {
        sources: params.sources,
        maxResults: params.maxResults ?? 10,
      });
      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, results, sources: [...new Set(results.map((r) => r.source))] },
      };
    },
  });

  // Backward-compatible alias
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the web and ArXiv for information. Alias for ml_search.",
    promptSnippet: "Search web and ArXiv",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      sources: Type.Optional(Type.Array(Type.String(), { description: "Sources to search. Default: all" })),
      maxResults: Type.Optional(Type.Number({ default: 10, description: "Maximum results" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const results = await state.deepSearch.search(params.query, {
        sources: params.sources,
        maxResults: params.maxResults ?? 10,
      });
      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, results, sources: [...new Set(results.map((r) => r.source))] },
      };
    },
  });

  pi.registerTool({
    name: "search_paper",
    label: "Paper Lookup",
    description: "Deep lookup of a specific paper by ID. Returns full metadata: abstract, benchmarks, code repos, citations.",
    promptSnippet: "Get full details for a specific paper",
    parameters: Type.Object({
      paperId: Type.String({ description: "Paper ID: ArXiv ID, Semantic Scholar ID, or PapersWithCode ID" }),
      source: Type.Optional(Type.String({ description: "Source to query: semantic-scholar, pwc, arxiv. Default: tries all" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const details = await state.deepSearch.fetchDetails(params.paperId, params.source);
      if (!details) {
        return { content: [{ type: "text", text: `Paper not found: ${params.paperId}` }], details: null };
      }
      const lines: string[] = [
        `${details.title}`,
        details.authors?.length ? `Authors: ${details.authors.join(", ")}` : "",
        details.publishedAt ? `Published: ${details.publishedAt}` : "",
        details.citations !== undefined ? `Citations: ${details.citations}` : "",
        details.url ? `URL: ${details.url}` : "",
        details.paperUrl ? `PDF: ${details.paperUrl}` : "",
        details.codeUrl ? `Code: ${details.codeUrl}` : "",
        "",
        details.snippet,
        details.techniques?.length ? `\nTechniques: ${details.techniques.join(", ")}` : "",
        details.datasets?.length ? `\nDatasets: ${details.datasets.join(", ")}` : "",
        details.frameworks?.length ? `\nFrameworks: ${details.frameworks.join(", ")}` : "",
        details.metrics && Object.keys(details.metrics).length > 0
          ? `\nBenchmark results:\n${Object.entries(details.metrics).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`
          : "",
      ].filter(Boolean);
      return { content: [{ type: "text", text: lines.join("\n") }], details };
    },
  });

  pi.registerTool({
    name: "search_implementations",
    label: "Find Implementations",
    description: "Find GitHub repos implementing a specific ML technique, filtered by framework and stars.",
    promptSnippet: "Find code implementations of a technique",
    parameters: Type.Object({
      technique: Type.String({ description: 'Technique to find implementations for, e.g. "quantization-aware training"' }),
      language: Type.Optional(Type.String({ default: "python", description: "Programming language filter" })),
      framework: Type.Optional(Type.String({ description: "Framework filter: pytorch, tensorflow, jax, etc." })),
      minStars: Type.Optional(Type.Number({ default: 10, description: "Minimum GitHub stars" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      let query = params.technique;
      if (params.language) query += ` language:${params.language}`;
      if (params.framework) query += ` ${params.framework}`;
      if (params.minStars && params.minStars > 0) query += ` stars:>=${params.minStars}`;
      const results = await state.deepSearch.search(query, {
        sources: ["github"],
        maxResults: 10,
      });
      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, results },
      };
    },
  });

  pi.registerTool({
    name: "search_benchmarks",
    label: "Benchmark Lookup",
    description: "Find SOTA benchmark results for a dataset/task from PapersWithCode.",
    promptSnippet: "Get SOTA leaderboard for a dataset or task",
    parameters: Type.Object({
      dataset: Type.Optional(Type.String({ description: 'Dataset name, e.g. "ImageNet", "CIFAR-10"' })),
      task: Type.Optional(Type.String({ description: 'Task name, e.g. "Image Classification"' })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const query = [params.dataset, params.task].filter(Boolean).join(" ");
      if (!query) {
        return { content: [{ type: "text", text: "Provide at least a dataset or task name." }], details: null };
      }
      const results = await state.deepSearch.search(query, {
        sources: ["pwc"],
        maxResults: 15,
      });
      return {
        content: [{ type: "text", text: formatResults(results) }],
        details: { count: results.length, results },
      };
    },
  });

  pi.registerTool({
    name: "log_analyze",
    label: "Analyze Log",
    description: "Parse training logs and extract key metrics",
    parameters: Type.Object({
      experimentId: Type.String(),
      artifactId: Type.Optional(Type.String()),
      patterns: Type.Optional(Type.Array(Type.String(), { default: ["loss", "accuracy", "val_loss", "val_accuracy", "epoch", "step"] })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      let logContent: string;

      if (params.artifactId) {
        const art = await state.artifactRegistry.get(params.artifactId);
        if (!art) throw new Error(`Artifact not found: ${params.artifactId}`);
        logContent = await state.artifactRegistry.read(art.id).then((b) => b.toString("utf-8"));
      } else {
        const arts = await state.artifactRegistry.list(params.experimentId);
        const logArt = arts.find((a) => a.type === "log");
        if (!logArt) throw new Error("No log artifact found for this experiment");
        logContent = await state.artifactRegistry.read(logArt.id).then((b) => b.toString("utf-8"));
      }

      const lines = logContent.split("\n");
      const metrics: Record<string, number[]> = {};
      const searchPatterns = params.patterns ?? ["loss", "accuracy", "val_loss", "val_accuracy", "epoch", "step"];

      for (const line of lines) {
        for (const pat of searchPatterns) {
          const regex = new RegExp(`${pat}[:=\\s]+([0-9.eE-]+)`, "i");
          const match = line.match(regex);
          if (match) {
            metrics[pat] = metrics[pat] || [];
            metrics[pat].push(parseFloat(match[1]));
          }
        }
      }

      const summary = Object.entries(metrics)
        .map(([k, v]) => {
          const last = v[v.length - 1];
          const best = k.includes("loss") ? Math.min(...v) : Math.max(...v);
          return `${k}: last=${last.toFixed(6)}, best=${best.toFixed(6)}, count=${v.length}`;
        })
        .join("\n");

      return {
        content: [{ type: "text", text: summary || "No metrics found." }],
        details: { metrics },
      };
    },
  });
}
