import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as path from "node:path";
import { ArtifactRegistry } from "./store/artifact-registry.js";
import { ExperimentStore } from "./store/experiment-store.js";
import { LocalRunner } from "./runner/local-runner.js";
import { DeepSearch } from "./search/deep-search.js";
import { ArxivSource } from "./search/sources/arxiv-source.js";
import { WebSource } from "./search/sources/web-source.js";
import { PwcSource } from "./search/sources/pwc-source.js";
import { SemanticScholarSource } from "./search/sources/semantic-scholar-source.js";
import { GithubSource } from "./search/sources/github-source.js";
import { HuggingFaceSource } from "./search/sources/huggingface-source.js";
import type { SessionState, MlExtensionSettings } from "./types/settings.js";
import { loadSettings } from "./settings.js";
import { Journal } from "./memory/journal.js";
import { KnowledgeStore } from "./memory/knowledge.js";
import { InvestigationManager } from "./investigation/manager.js";
import { DoomLoopDetector } from "./patterns/doom-loop.js";
import { GateChecker } from "./patterns/gates.js";
import { seedPatterns } from "./memory/seed-patterns.js";
import { registerExperimentTools } from "./tools/experiment-tools.js";
import { registerArtifactTools } from "./tools/artifact-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerCodeTools } from "./tools/code-tools.js";
import { registerPipelineTools } from "./tools/ml-pipeline-tools.js";
import { registerInvestigationTools } from "./tools/investigation-tools.js";
import { registerHypothesisTools } from "./tools/hypothesis-tools.js";
import { registerMemoryTools } from "./tools/memory-tools.js";
import { registerLeakageTools } from "./tools/leakage-tools.js";
import { registerDiagnosticsTools } from "./tools/diagnostics-tools.js";
import { registerMlAgentCommand, registerMlLoopCommand } from "./commands/index.js";

interface SessionModules {
  state: SessionState;
  journal: Journal;
  knowledge: KnowledgeStore;
  manager: InvestigationManager;
  doomLoop: DoomLoopDetector;
  gates: GateChecker;
}

const sessions = new Map<string, SessionModules>();
let currentSettings: MlExtensionSettings = {};

function getModules(ctx: any): SessionModules {
  const sessionId = ctx.sessionManager.getSessionId();
  let modules = sessions.get(sessionId);
  if (!modules) {
    const cwd = ctx.cwd;
    const baseDir = path.join(cwd, ".cache", "ml-agent");
    const cacheDir = path.join(baseDir, "search-cache");
    const cacheTtlMs = currentSettings.searchCacheTtlHours
      ? currentSettings.searchCacheTtlHours * 60 * 60 * 1000
      : undefined;

    const journal = new Journal(path.join(baseDir, "journal"));
    const knowledge = new KnowledgeStore(path.join(baseDir, "knowledge"));
    const manager = new InvestigationManager(
      path.join(baseDir, "investigations"),
      journal,
    );

    const state: SessionState = {
      artifactRegistry: new ArtifactRegistry(baseDir),
      experimentStore: new ExperimentStore(
        path.join(baseDir, "experiments.jsonl"),
      ),
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

    modules = {
      state,
      journal,
      knowledge,
      manager,
      doomLoop: new DoomLoopDetector(),
      gates: new GateChecker(),
    };
    sessions.set(sessionId, modules);
  }
  return modules;
}

function getState(ctx: any): SessionState {
  return getModules(ctx).state;
}

export default async function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    try {
      const loaded = await loadSettings(ctx.cwd);
      Object.assign(currentSettings, loaded);
    } catch {
      // ignore
    }

    try {
      const modules = getModules(ctx);
      await seedPatterns(modules.knowledge);
    } catch {
      // seed failure is non-fatal
    }
  });

  // Existing tools
  registerExperimentTools(pi, getState);
  registerArtifactTools(pi, getState);
  registerSearchTools(pi, getState);
  registerCodeTools(pi, getState);
  registerPipelineTools(pi, getState);

  // New tools
  registerInvestigationTools(
    pi,
    (ctx) => getModules(ctx).manager,
    (ctx) => getModules(ctx).journal,
  );
  registerHypothesisTools(pi, (ctx) => getModules(ctx).journal);
  registerMemoryTools(
    pi,
    (ctx) => getModules(ctx).journal,
    (ctx) => getModules(ctx).knowledge,
  );
  registerLeakageTools(pi);
  registerDiagnosticsTools(pi);

  // Commands
  registerMlAgentCommand(
    pi,
    (ctx) => getModules(ctx).manager,
    (ctx) => getModules(ctx).journal,
  );
  registerMlLoopCommand(pi, (ctx) => getModules(ctx).manager);

  pi.on("session_shutdown", async (_event, ctx) => {
    const sessionId = ctx.sessionManager.getSessionId();
    sessions.delete(sessionId);
  });
}
