import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as path from "node:path";
import { ArtifactRegistry } from "./core/artifact-registry.js";
import { ExperimentStore } from "./core/experiment-store.js";
import { LocalRunner } from "./core/local-runner.js";
import { DeepSearch } from "./search/deep-search.js";
import { ArxivSource } from "./search/sources/arxiv-source.js";
import { WebSource } from "./search/sources/web-source.js";
import { PwcSource } from "./search/sources/pwc-source.js";
import { SemanticScholarSource } from "./search/sources/semantic-scholar-source.js";
import { GithubSource } from "./search/sources/github-source.js";
import { HuggingFaceSource } from "./search/sources/huggingface-source.js";
import type { SessionState, MlExtensionSettings } from "./types.js";
import { loadSettings } from "./settings.js";
import { registerExperimentTools } from "./tools/experiment-tools.js";
import { registerArtifactTools } from "./tools/artifact-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerCodeTools } from "./tools/code-tools.js";
import { registerPipelineTools } from "./tools/ml-pipeline-tools.js";

const sessionStates = new Map<string, SessionState>();
let currentSettings: MlExtensionSettings = {};

function getState(ctx: any): SessionState {
  const sessionId = ctx.sessionManager.getSessionId();
  let state = sessionStates.get(sessionId);
  if (!state) {
    const cwd = ctx.cwd;
    const cacheDir = path.join(cwd, ".ml-agent", "search-cache");
    const cacheTtlMs = currentSettings.searchCacheTtlHours
      ? currentSettings.searchCacheTtlHours * 60 * 60 * 1000
      : undefined;

    state = {
      artifactRegistry: new ArtifactRegistry(path.join(cwd, ".ml-agent")),
      experimentStore: new ExperimentStore(path.join(cwd, ".ml-agent", "experiments.jsonl")),
      runner: new LocalRunner(),
      deepSearch: new DeepSearch(
        [
          new ArxivSource(),
          new SemanticScholarSource(currentSettings.semanticScholarApiKey),
          new PwcSource(),
          new GithubSource(currentSettings.githubToken),
          new HuggingFaceSource(),
          new WebSource(currentSettings.searxngUrl),
        ],
        cacheDir,
        cacheTtlMs,
      ),
    };
    sessionStates.set(sessionId, state);
  }
  return state;
}

export default async function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    try {
      const loaded = await loadSettings(ctx.cwd);
      Object.assign(currentSettings, loaded);
    } catch {
      // ignore
    }
  });

  registerExperimentTools(pi, getState);
  registerArtifactTools(pi, getState);
  registerSearchTools(pi, getState);
  registerCodeTools(pi, getState);
  registerPipelineTools(pi, getState);

  pi.registerCommand("ml-leaderboard", {
    description: "Show experiment leaderboard sorted by best metric",
    handler: async (_args, ctx) => {
      const state = getState(ctx);
      const exps = await state.experimentStore.list();
      const lines = exps
        .filter((e) => e.results)
        .sort((a, b) => {
          const aVal = Number(a.results?.val_loss ?? a.results?.loss ?? Infinity);
          const bVal = Number(b.results?.val_loss ?? b.results?.loss ?? Infinity);
          return aVal - bVal;
        })
        .map((e) => `${e.id}: ${e.name} | status=${e.status} | results=${JSON.stringify(e.results)}`);
      ctx.ui.notify(lines.slice(0, currentSettings.maxExperimentsInLeaderboard ?? 20).join("\n") || "No experiments with results.", "info");
    },
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    sessionStates.delete(sessionId);
  });
}
