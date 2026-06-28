import { spawn } from "cross-spawn";
import { glob } from "glob";
import type { ExperimentRunner, RunConfig, RunResult, RunStatus } from "../types/runner.js";

export class LocalRunner implements ExperimentRunner {
  private activeRuns = new Map<string, { child: ReturnType<typeof spawn> }>();

  async run(config: RunConfig): Promise<RunResult> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [cmd, ...args] = config.command.split(" ");

    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, {
        cwd: config.workingDir,
        timeout: config.timeoutSeconds * 1000,
      });

      this.activeRuns.set(runId, { child });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString("utf-8");
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString("utf-8");
      });

      child.on("close", async (exitCode) => {
        this.activeRuns.delete(runId);
        const outputFiles: string[] = [];
        for (const pattern of config.outputPatterns) {
          const matches = await glob(pattern, { cwd: config.workingDir, absolute: true });
          outputFiles.push(...matches);
        }
        resolve({ runId, exitCode, stdout, stderr, outputFiles });
      });

      child.on("error", (err) => {
        this.activeRuns.delete(runId);
        reject(err);
      });
    });
  }

  async status(runId: string): Promise<RunStatus> {
    const active = this.activeRuns.has(runId);
    return { runId, state: active ? "running" : "completed" };
  }

  async stop(runId: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.child.kill("SIGTERM");
    }
  }

  async syncArtifacts(runId: string, localDir: string): Promise<void> {
    void runId;
    void localDir;
  }
}
