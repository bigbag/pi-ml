export type ExperimentId = string;
export type ExperimentStatus = "planned" | "running" | "completed" | "failed" | "aborted";

export interface ExperimentRecord {
  id: ExperimentId;
  name: string;
  hypothesis: string;
  status: ExperimentStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  configArtifactId: string;
  codeArtifactId: string;
  metricArtifactId?: string;
  predictionArtifactId?: string;
  tags: string[];
  parentExperimentId?: string;
  derivedExperimentIds: string[];
  hyperparameters?: Record<string, unknown>;
  results?: Record<string, unknown>;
}
