import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as path from "node:path";
import { ArtifactRegistry } from "./core/artifact-registry.js";
import { ExperimentStore } from "./core/experiment-store.js";
import { LocalRunner } from "./core/local-runner.js";
import { DeepSearch } from "./search/deep-search.js";
import { ArxivSource } from "./search/sources/arxiv-source.js";
import { WebSource } from "./search/sources/web-source.js";
import type { SessionState, MlExtensionSettings } from "./types.js";
import { loadSettings } from "./settings.js";
import { registerExperimentTools } from "./tools/experiment-tools.js";
import { registerArtifactTools } from "./tools/artifact-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerCodeTools } from "./tools/code-tools.js";
import { registerPipelineTools } from "./tools/ml-pipeline-tools.js";

const sessionStates = new Map<string, SessionState>();

function getState(ctx: any): SessionState {
  const sessionId = ctx.sessionManager.getSessionId();
  let state = sessionStates.get(sessionId);
  if (!state) {
    const cwd = ctx.cwd;
    state = {
      artifactRegistry: new ArtifactRegistry(path.join(cwd, ".ml-agent")),
      experimentStore: new ExperimentStore(path.join(cwd, ".ml-agent", "experiments.jsonl")),
      runner: new LocalRunner(),
      deepSearch: new DeepSearch(
        [new ArxivSource(), new WebSource()],
        path.join(cwd, ".ml-agent", "search-cache"),
      ),
    };
    sessionStates.set(sessionId, state);
  }
  return state;
}

export default async function (pi: ExtensionAPI) {
  const settings: MlExtensionSettings = {};

  pi.on("session_start", async (_event, ctx) => {
    try {
      const loaded = await loadSettings(ctx.cwd);
      Object.assign(settings, loaded);
    } catch {
      // ignore
    }
  });

  // Register all ML tools
  registerExperimentTools(pi, getState);
  registerArtifactTools(pi, getState);
  registerSearchTools(pi, getState);
  registerCodeTools(pi, getState);
  registerPipelineTools(pi, getState);

  // Command: /ml-leaderboard
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
      ctx.ui.notify(lines.slice(0, settings.maxExperimentsInLeaderboard ?? 20).join("\n") || "No experiments with results.", "info");
    },
  });

  // Cleanup on session end
  pi.on("session_shutdown", async (_event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    sessionStates.delete(sessionId);
  });
}
