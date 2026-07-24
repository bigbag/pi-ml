import { spawn } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { glob } from "glob";
import type { ExperimentRunner, RunConfig, RunResult, RunStatus } from "../types/runner.js";
import { newId } from "../util/ids.js";

const MAX_BUFFER_CHARS = 2 * 1024 * 1024; // 2MB in-memory tail cap

function appendCapped(current: string, chunk: string, max = MAX_BUFFER_CHARS): string {
  const next = current + chunk;
  if (next.length <= max) return next;
  return next.slice(next.length - max);
}

export class LocalRunner implements ExperimentRunner {
  private activeRuns = new Map<string, { child: ReturnType<typeof spawn> }>();

  async run(config: RunConfig): Promise<RunResult> {
    const runId = newId("run");
    const shell = process.env.SHELL || "/bin/bash";

    if (config.logPath) {
      await fs.mkdir(path.dirname(config.logPath), { recursive: true });
      await fs.writeFile(config.logPath, "");
    }

    return new Promise((resolve, reject) => {
      const child = spawn(shell, ["-lc", config.command], {
        cwd: config.workingDir,
        env: { ...process.env, ...config.env },
      });

      this.activeRuns.set(runId, { child });

      let stdout = "";
      let stderr = "";
      let settled = false;
      let timedOut = false;

      const timeoutMs = Math.max(1, (config.timeoutSeconds || 3600) * 1000);
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, 5_000).unref?.();
      }, timeoutMs);

      const tee = async (stream: "stdout" | "stderr", chunk: string) => {
        if (stream === "stdout") stdout = appendCapped(stdout, chunk);
        else stderr = appendCapped(stderr, chunk);
        if (config.logPath) {
          try {
            await fs.appendFile(config.logPath, chunk);
          } catch {
            // best-effort log tee
          }
        }
      };

      child.stdout?.on("data", (data: Buffer) => {
        void tee("stdout", data.toString("utf-8"));
      });

      child.stderr?.on("data", (data: Buffer) => {
        void tee("stderr", data.toString("utf-8"));
      });

      child.on("close", async (exitCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.activeRuns.delete(runId);

        const outputFiles: string[] = [];
        for (const pattern of config.outputPatterns) {
          try {
            const matches = await glob(pattern, { cwd: config.workingDir, absolute: true });
            outputFiles.push(...matches);
          } catch {
            // ignore bad patterns
          }
        }

        if (timedOut && exitCode === null) {
          stderr = appendCapped(stderr, `\n[local-runner] timed out after ${config.timeoutSeconds}s\n`);
        }

        resolve({
          runId,
          exitCode: timedOut && exitCode === null ? 124 : exitCode,
          stdout,
          stderr,
          outputFiles,
          logPath: config.logPath,
        });
      });

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
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
