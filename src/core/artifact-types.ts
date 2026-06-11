export type ArtifactType =
  | "model"
  | "checkpoint"
  | "log"
  | "config"
  | "code"
  | "prediction"
  | "plot"
  | "dataset"
  | "report";

export type ArtifactId = string;
export type ExperimentId = string;

export interface ArtifactMetadata {
  id: ArtifactId;
  experimentId: ExperimentId;
  type: ArtifactType;
  name: string;
  createdAt: number;
  size: number;
  checksum: string;
  tags: string[];
  source: string;
  dependencies: ArtifactId[];
}

export interface ArtifactFilter {
  experimentId?: ExperimentId;
  type?: ArtifactType;
  tags?: string[];
  after?: number;
  before?: number;
}

export interface ArtifactDiff {
  type: "text" | "binary" | "none";
  diffs: Array<{ lineA: number; lineB: number; before: string; after: string }>;
  before: string | null;
  after: string | null;
}
