export interface MlExtensionSettings {
  maxExperimentsInLeaderboard?: number;
  defaultArtifactTags?: string[];
  githubToken?: string;
  semanticScholarApiKey?: string;
  searxngUrl?: string;
  searchCacheTtlHours?: number;
}

export interface SessionState {
  artifactRegistry: import("../store/artifact-registry.js").ArtifactRegistry;
  experimentStore: import("../store/experiment-store.js").ExperimentStore;
  runner: import("../runner/local-runner.js").LocalRunner;
  deepSearch: import("../search/deep-search.js").DeepSearch;
  searchContext?: import("./search.js").SearchContext;
}
