import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types.js";

export function registerSearchTools(pi: ExtensionAPI, getState: (ctx: any) => SessionState) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the web and ArXiv for information. Use for researching papers, techniques, documentation, or current best practices.",
    promptSnippet: "Search web and ArXiv",
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
      sources: Type.Optional(Type.Array(Type.String(), { description: "Sources: 'arxiv' for papers, 'web' for general web. Default: both" })),
      maxResults: Type.Optional(Type.Number({ default: 10, description: "Maximum results" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const results = await state.deepSearch.search(params.query, {
        sources: params.sources,
        maxResults: params.maxResults ?? 10,
      });
      if (results.length === 0) {
        return { content: [{ type: "text", text: "No results found." }], details: { count: 0 } };
      }
      const lines = results.map((r, i) => {
        return `[${i + 1}] ${r.title}\n    Source: ${r.source}${r.publishedAt ? ` | ${r.publishedAt}` : ""}\n    URL: ${r.url}\n    ${r.snippet}`;
      });
      return {
        content: [{ type: "text", text: lines.join("\n\n") }],
        details: { count: results.length, sources: [...new Set(results.map((r) => r.source))] },
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
      const fs = await import("node:fs/promises");
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
