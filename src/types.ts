export interface MlExtensionSettings {
  maxExperimentsInLeaderboard?: number;
  defaultArtifactTags?: string[];
  githubToken?: string;
  semanticScholarApiKey?: string;
  searxngUrl?: string;
  searchCacheTtlHours?: number;
}

export interface SessionState {
  artifactRegistry: import("./core/artifact-registry.js").ArtifactRegistry;
  experimentStore: import("./core/experiment-store.js").ExperimentStore;
  runner: import("./core/local-runner.js").LocalRunner;
  deepSearch: import("./search/deep-search.js").DeepSearch;
  searchContext?: import("./search/search-types.js").SearchContext;
}
