import { Type } from "typebox";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types/settings.js";
import type { Journal } from "../memory/journal.js";
import type { InvestigationManager } from "../investigation/manager.js";
import type { ExperimentRecord } from "../types/experiment.js";
import type { ExperimentJournalRecord } from "../types/journal.js";
import { AutoLoopPattern } from "../patterns/auto-loop.js";

function coerceMetrics(results?: Record<string, unknown>): Record<string, number> {
  const metrics: Record<string, number> = {};
  if (!results) return metrics;
  for (const [k, v] of Object.entries(results)) {
    if (typeof v === "number" && Number.isFinite(v)) metrics[k] = v;
    else if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      metrics[k] = Number(v);
    }
  }
  return metrics;
}

async function syncJournalExperiment(
  journal: Journal,
  manager: InvestigationManager,
  exp: Pick<ExperimentRecord, "id" | "name" | "hyperparameters" | "results" | "status" | "hypothesisId" | "investigationId">,
  investigationId?: string,
): Promise<string | undefined> {
  const invId =
    investigationId ??
    exp.investigationId ??
    (await manager.getActiveId());
  if (!invId) return undefined;

  const record: ExperimentJournalRecord = {
    id: exp.id,
    investigationId: invId,
    hypothesisId: exp.hypothesisId,
    timestamp: new Date().toISOString(),
    name: exp.name,
    status: exp.status,
    config: {
      model: String((exp.hyperparameters as any)?.model ?? "unknown"),
      features: [],
      params: exp.hyperparameters ?? {},
    },
    metrics: coerceMetrics(exp.results as Record<string, unknown> | undefined),
    outcome: "unknown",
    hyperparameters: exp.hyperparameters,
    results: exp.results,
  };
  await journal.upsertExperiment(exp.id, record);

  if (exp.hypothesisId) {
    await journal.linkExperimentToHypothesis(exp.hypothesisId, exp.id);
  }
  return invId;
}

function postRunFooter(opts: {
  outputCount: number;
  logRegistered: boolean;
  remindStopPod: boolean;
}): string {
  const lines = [
    "",
    `Artifacts registered: ${opts.outputCount + (opts.logRegistered ? 1 : 0)}`,
  ];
  if (opts.remindStopPod) {
    lines.push(
      "If this used a RunPod GPU: rsync artifacts locally, then stop the pod (runpod skill).",
    );
  }
  return lines.join("\n");
}

export function registerExperimentTools(
  pi: ExtensionAPI,
  getState: (ctx: any) => SessionState,
  getJournal: (ctx: any) => Journal,
  getManager: (ctx: any) => InvestigationManager,
) {
  pi.registerTool({
    name: "experiment_track",
    label: "Track Experiment",
    description: "Record experiment metadata and results",
    promptSnippet: "Create, update, list, or get experiments",
    parameters: Type.Object({
      action: Type.Union([
        Type.Literal("create"),
        Type.Literal("update"),
        Type.Literal("get"),
        Type.Literal("list"),
      ]),
      experimentId: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
      codeArtifactId: Type.Optional(Type.String()),
      configArtifactId: Type.Optional(Type.String()),
      hyperparameters: Type.Optional(Type.Record(Type.String(), Type.Any())),
      results: Type.Optional(Type.Record(Type.String(), Type.Any())),
      investigationId: Type.Optional(Type.String()),
      hypothesisId: Type.Optional(Type.String()),
      status: Type.Optional(Type.Union([
        Type.Literal("planned"),
        Type.Literal("running"),
        Type.Literal("completed"),
        Type.Literal("failed"),
        Type.Literal("aborted"),
      ])),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const journal = getJournal(ctx);
      const manager = getManager(ctx);

      if (params.action !== "list" && !params.experimentId) {
        throw new Error(`experimentId required for action=${params.action}`);
      }

      switch (params.action) {
        case "create": {
          const activeId = params.investigationId ?? (await manager.getActiveId());
          const exp = await state.experimentStore.create({
            id: params.experimentId!,
            name: params.name || params.experimentId!,
            codeArtifactId: params.codeArtifactId,
            configArtifactId: params.configArtifactId,
            hyperparameters: params.hyperparameters || {},
            status: params.status ?? "planned",
            investigationId: activeId,
            hypothesisId: params.hypothesisId,
            results: params.results,
          });
          await syncJournalExperiment(journal, manager, exp, activeId);
          return {
            content: [{ type: "text", text: `Experiment created: ${exp.id}${activeId ? ` (inv ${activeId})` : ""}` }],
            details: { experiment: exp },
          };
        }
        case "update": {
          const updates: Partial<ExperimentRecord> = {};
          if (params.hyperparameters) updates.hyperparameters = params.hyperparameters;
          if (params.results) updates.results = params.results;
          if (params.status) updates.status = params.status;
          if (params.hypothesisId) updates.hypothesisId = params.hypothesisId;
          if (params.investigationId) updates.investigationId = params.investigationId;
          if (params.name) updates.name = params.name;

          // Upsert skeleton if missing
          const existing = await state.experimentStore.get(params.experimentId!);
          if (!existing) {
            await state.experimentStore.getOrCreate(params.experimentId!, {
              name: params.name ?? params.experimentId!,
              status: "planned",
              investigationId: params.investigationId ?? (await manager.getActiveId()),
              hypothesisId: params.hypothesisId,
            });
          }
          await state.experimentStore.update(params.experimentId!, updates);
          const exp = await state.experimentStore.get(params.experimentId!);
          if (exp) await syncJournalExperiment(journal, manager, exp);

          // Loop budget bookkeeping on completed updates with metrics
          if (exp?.investigationId && params.results) {
            await maybeAdvanceLoop(manager, exp);
          }

          return {
            content: [{ type: "text", text: `Experiment ${params.experimentId} updated.` }],
            details: { updated: Object.keys(updates) },
          };
        }
        case "get": {
          const exp = await state.experimentStore.get(params.experimentId!);
          if (!exp) throw new Error(`Experiment not found: ${params.experimentId}`);
          return {
            content: [{ type: "text", text: JSON.stringify(exp, null, 2) }],
            details: { experiment: exp },
          };
        }
        case "list": {
          const exps = await state.experimentStore.list(
            params.investigationId ? { investigationId: params.investigationId } : undefined,
          );
          const lines = exps.map((e) => `${e.id}: ${e.name} [${e.status}]`);
          return {
            content: [{ type: "text", text: lines.join("\n") || "No experiments." }],
            details: { count: exps.length },
          };
        }
      }
      throw new Error("Unknown action");
    },
  });

  pi.registerTool({
    name: "experiment_run",
    label: "Run Experiment",
    description: "Execute a training script and capture all outputs as artifacts",
    promptSnippet: "Run training scripts and capture outputs",
    parameters: Type.Object({
      experimentId: Type.String(),
      command: Type.String(),
      workingDir: Type.String(),
      timeoutSeconds: Type.Optional(Type.Number({ default: 3600 })),
      outputPatterns: Type.Optional(Type.Array(Type.String(), { default: ["*.pt", "*.pth", "*.log", "*.json", "*.csv"] })),
      outputDir: Type.Optional(Type.String({ description: "Optional directory to register all files from after run" })),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const journal = getJournal(ctx);
      const manager = getManager(ctx);

      if (state.settings?.requireLeakPreflight) {
        const last = state.lastLeakPreflightAt ?? 0;
        if (Date.now() - last > 30 * 60 * 1000) {
          throw new Error(
            "leak_preflight required in the last 30 minutes before experiment_run " +
              "(set requireLeakPreflight=false in pi-ml.json to disable)",
          );
        }
      }

      const activeId = await manager.getActiveId();
      let exp = await state.experimentStore.getOrCreate(params.experimentId, {
        name: params.experimentId,
        status: "planned",
        investigationId: activeId,
      });
      // Backfill investigationId on legacy rows so load/status stay linked.
      if (activeId && !exp.investigationId) {
        await state.experimentStore.update(params.experimentId, { investigationId: activeId });
        exp = { ...exp, investigationId: activeId };
      }
      await state.experimentStore.updateStatus(params.experimentId, "running");
      await syncJournalExperiment(journal, manager, { ...exp, status: "running" }, activeId ?? exp.investigationId);

      const cacheTmp = path.join(ctx.cwd ?? params.workingDir, ".cache", "ml-agent", "tmp");
      await fs.mkdir(cacheTmp, { recursive: true });
      const safeId = params.experimentId.replace(/[^a-zA-Z0-9._-]/g, "_");
      const logPath = path.join(cacheTmp, `run-${safeId}-${Date.now()}.log`);

      try {
        const result = await state.runner.run({
          experimentId: params.experimentId,
          codeArtifactId: exp.codeArtifactId,
          configArtifactId: exp.configArtifactId,
          command: params.command,
          workingDir: params.workingDir,
          timeoutSeconds: params.timeoutSeconds ?? 3600,
          outputPatterns: params.outputPatterns ?? ["*.pt", "*.pth", "*.log", "*.json", "*.csv"],
          logPath,
        });

        if (signal?.aborted) {
          await state.experimentStore.updateStatus(params.experimentId, "aborted");
          const aborted = await state.experimentStore.get(params.experimentId);
          if (aborted) {
            await syncJournalExperiment(journal, manager, aborted, activeId ?? exp.investigationId);
          }
          const abortErr = new Error("Experiment aborted");
          (abortErr as Error & { code?: string }).code = "EXPERIMENT_ABORTED";
          throw abortErr;
        }

        let logRegistered = false;
        try {
          await state.artifactRegistry.register(
            params.experimentId,
            "log",
            "run.log",
            logPath,
            { source: "experiment_run" },
          );
          logRegistered = true;
        } catch {
          // registry may fail if path issues; keep file on disk
        }

        const registeredFiles = [...result.outputFiles];
        if (params.outputDir) {
          try {
            const { glob } = await import("glob");
            const extra = await glob("**/*", {
              cwd: params.outputDir,
              absolute: true,
              nodir: true,
            });
            registeredFiles.push(...extra);
          } catch {
            // ignore
          }
        }

        for (const file of registeredFiles) {
          const name = path.basename(file);
          const type = inferArtifactType(name);
          try {
            await state.artifactRegistry.register(params.experimentId, type, name, file, {
              source: "experiment_run",
            });
          } catch {
            // skip individual file failures
          }
        }

        const runStatus = result.exitCode === 0 ? "completed" : "failed";
        await state.experimentStore.updateStatus(params.experimentId, runStatus);
        const updated = await state.experimentStore.get(params.experimentId);
        if (updated) {
          await syncJournalExperiment(journal, manager, updated, activeId ?? exp.investigationId);
        }

        const loopInv = activeId ?? exp.investigationId;
        if (loopInv) {
          await incrementLoopOnRun(manager, loopInv);
        }

        const remindStopPod =
          !state.settings?.postRunHooks ||
          state.settings.postRunHooks.includes("remind_stop_pod");

        const footer = postRunFooter({
          outputCount: registeredFiles.length,
          logRegistered,
          remindStopPod,
        });

        return {
          content: [{
            type: "text",
            text:
              `Experiment ${runStatus}. Exit code: ${result.exitCode}. ` +
              `Outputs: ${registeredFiles.length} files. Log: ${logPath}${footer}`,
          }],
          details: {
            exitCode: result.exitCode,
            outputCount: registeredFiles.length,
            logPath,
            runId: result.runId,
          },
        };
      } catch (err) {
        const code = (err as { code?: string })?.code;
        // Don't overwrite explicit aborted status.
        if (code !== "EXPERIMENT_ABORTED") {
          await state.experimentStore.updateStatus(params.experimentId, "failed").catch(() => {});
          const failed = await state.experimentStore.get(params.experimentId).catch(() => undefined);
          if (failed) {
            await syncJournalExperiment(
              journal,
              manager,
              failed,
              activeId ?? exp.investigationId,
            ).catch(() => {});
          }
        }
        throw err;
      }
    },
  });
}

async function incrementLoopOnRun(manager: InvestigationManager, invId: string): Promise<void> {
  try {
    const inv = await manager.load(invId);
    if (!inv.loop?.active) return;
    const loop = {
      ...inv.loop,
      experimentsRun: (inv.loop.experimentsRun ?? 0) + 1,
    };
    const pattern = new AutoLoopPattern({
      maxExperiments: loop.budget,
      plateauRounds: 3,
      metricTarget:
        loop.targetMetric && loop.targetValue !== undefined
          ? {
              metric: loop.targetMetric,
              target: loop.targetValue,
              direction: loop.targetDirection ?? "above",
            }
          : undefined,
    });
    const cont = pattern.shouldContinue({
      experimentsRun: loop.experimentsRun,
      improvements: [],
      currentMetricValue: loop.bestMetricValue,
      roundsSinceImprovement: loop.roundsSinceImprovement,
    });
    if (!cont) {
      loop.active = false;
    }
    await manager.setLoopState(invId, loop);
  } catch {
    // non-fatal
  }
}

async function maybeAdvanceLoop(
  manager: InvestigationManager,
  exp: ExperimentRecord,
): Promise<void> {
  if (!exp.investigationId) return;
  try {
    const inv = await manager.load(exp.investigationId);
    if (!inv.loop?.active || !inv.loop.targetMetric) return;
    const metrics = coerceMetrics(exp.results as Record<string, unknown> | undefined);
    const val = metrics[inv.loop.targetMetric];
    if (val === undefined) return;
    const loop = { ...inv.loop };
    const better =
      loop.bestMetricValue === undefined
        ? true
        : (loop.targetDirection ?? "above") === "above"
          ? val > loop.bestMetricValue
          : val < loop.bestMetricValue;
    if (better) {
      loop.bestMetricValue = val;
      loop.roundsSinceImprovement = 0;
      await manager.updateContext(exp.investigationId, {
        currentBest: {
          metric: inv.loop.targetMetric,
          value: val,
          experimentId: exp.id,
        },
        loop,
      });
    } else {
      loop.roundsSinceImprovement = (loop.roundsSinceImprovement ?? 0) + 1;
      await manager.setLoopState(exp.investigationId, loop);
    }
  } catch {
    // non-fatal
  }
}

function inferArtifactType(filename: string): "model" | "checkpoint" | "log" | "config" | "prediction" | "plot" | "dataset" | "report" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pt") || lower.endsWith(".pth") || lower.endsWith(".onnx") || lower.endsWith(".pkl")) return "model";
  if (lower.endsWith(".ckpt")) return "checkpoint";
  if (lower.endsWith(".log")) return "log";
  if (lower.endsWith(".json") || lower.endsWith(".yaml") || lower.endsWith(".yml")) return "config";
  if (lower.endsWith(".csv") || lower.endsWith(".parquet")) return "dataset";
  if (lower.endsWith(".png") || lower.endsWith(".svg") || lower.endsWith(".jpg")) return "plot";
  if (lower.includes("pred") || lower.includes("submit")) return "prediction";
  return "report";
}
