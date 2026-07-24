export interface MlExtensionSettings {
  maxExperimentsInLeaderboard?: number;
  defaultArtifactTags?: string[];
  githubToken?: string;
  semanticScholarApiKey?: string;
  searxngUrl?: string;
  searchCacheTtlHours?: number;
  /**
   * When true, experiment_run requires a successful leak_preflight within the last 30 minutes.
   * Default false (opt-in for tabular competitions via project settings).
   */
  requireLeakPreflight?: boolean;
  /** Post-run reminder hooks. */
  postRunHooks?: Array<"remind_stop_pod" | "register_outputs">;
}

export interface SessionState {
  artifactRegistry: import("../store/artifact-registry.js").ArtifactRegistry;
  experimentStore: import("../store/experiment-store.js").ExperimentStore;
  runner: import("../runner/local-runner.js").LocalRunner;
  deepSearch: import("../search/deep-search.js").DeepSearch;
  searchContext?: import("./search.js").SearchContext;
  /** Timestamp of last leak_preflight call in this session. */
  lastLeakPreflightAt?: number;
  /** Settings snapshot for this session. */
  settings?: MlExtensionSettings;
  /** Soft warning already shown for bash-train nudge. */
  bashTrainNudgeShown?: boolean;
  /** Last doom-loop warning to inject into next agent start. */
  lastDoomWarning?: string;
}
