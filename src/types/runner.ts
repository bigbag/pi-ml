export interface RunConfig {
  experimentId: string;
  codeArtifactId: string;
  configArtifactId: string;
  command: string;
  workingDir: string;
  timeoutSeconds: number;
  outputPatterns: string[];
}

export interface RunResult {
  runId: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  outputFiles: string[];
}

export interface RunStatus {
  runId: string;
  state: "pending" | "running" | "completed" | "failed" | "stopped";
}

export interface ExperimentRunner {
  run(config: RunConfig): Promise<RunResult>;
  status(runId: string): Promise<RunStatus>;
  stop(runId: string): Promise<void>;
  syncArtifacts(runId: string, localDir: string): Promise<void>;
}
