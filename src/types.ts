export interface MlExtensionSettings {
  maxExperimentsInLeaderboard?: number;
  defaultArtifactTags?: string[];
}

export interface SessionState {
  artifactRegistry: import("./core/artifact-registry.js").ArtifactRegistry;
  experimentStore: import("./core/experiment-store.js").ExperimentStore;
  runner: import("./core/local-runner.js").LocalRunner;
  deepSearch: import("./search/deep-search.js").DeepSearch;
}
