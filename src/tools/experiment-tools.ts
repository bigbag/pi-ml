import { Type } from "typebox";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types/settings.js";

export function registerExperimentTools(pi: ExtensionAPI, getState: (ctx: any) => SessionState) {
  pi.registerTool({
    name: "experiment_track",
    label: "Track Experiment",
    description: "Record experiment metadata and results",
    promptSnippet: "Create, update, list, or get experiments",
    parameters: Type.Object({
      experimentId: Type.String(),
      action: Type.Union([
        Type.Literal("create"),
        Type.Literal("update"),
        Type.Literal("get"),
        Type.Literal("list"),
      ]),
      name: Type.Optional(Type.String()),
      codeArtifactId: Type.Optional(Type.String()),
      configArtifactId: Type.Optional(Type.String()),
      hyperparameters: Type.Optional(Type.Record(Type.String(), Type.Any())),
      results: Type.Optional(Type.Record(Type.String(), Type.Any())),
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
      switch (params.action) {
        case "create": {
          const exp = await state.experimentStore.create({
            id: params.experimentId,
            name: params.name || params.experimentId,
            codeArtifactId: params.codeArtifactId,
            configArtifactId: params.configArtifactId,
            hyperparameters: params.hyperparameters || {},
            status: "planned",
          });
          return {
            content: [{ type: "text", text: `Experiment created: ${exp.id}` }],
            details: { experiment: exp },
          };
        }
        case "update": {
          const updates: any = {};
          if (params.hyperparameters) updates.hyperparameters = params.hyperparameters;
          if (params.results) updates.results = params.results;
          if (params.status) updates.status = params.status;
          await state.experimentStore.update(params.experimentId, updates);
          return {
            content: [{ type: "text", text: `Experiment ${params.experimentId} updated.` }],
            details: { updated: Object.keys(updates) },
          };
        }
        case "get": {
          const exp = await state.experimentStore.get(params.experimentId);
          if (!exp) throw new Error(`Experiment not found: ${params.experimentId}`);
          return {
            content: [{ type: "text", text: JSON.stringify(exp, null, 2) }],
            details: { experiment: exp },
          };
        }
        case "list": {
          const exps = await state.experimentStore.list();
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
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const exp = await state.experimentStore.get(params.experimentId);
      if (!exp) throw new Error(`Experiment not found: ${params.experimentId}`);
      await state.experimentStore.updateStatus(params.experimentId, "running");

      try {
        const result = await state.runner.run({
          experimentId: params.experimentId,
          codeArtifactId: exp.codeArtifactId,
          configArtifactId: exp.configArtifactId,
          command: params.command,
          workingDir: params.workingDir,
          timeoutSeconds: params.timeoutSeconds ?? 3600,
          outputPatterns: params.outputPatterns ?? ["*.pt", "*.pth", "*.log", "*.json", "*.csv"],
        });

        if (signal?.aborted) {
          await state.experimentStore.updateStatus(params.experimentId, "aborted");
          throw new Error("Experiment aborted");
        }

        const logPath = path.join(params.workingDir, `.ml-agent/tmp-stdout-${Date.now()}.log`);
        await fs.mkdir(path.dirname(logPath), { recursive: true });
        await fs.writeFile(logPath, result.stdout + "\n---STDERR---\n" + result.stderr);
        await state.artifactRegistry.register(params.experimentId, "log", "run.log", logPath, { source: "experiment_run" });
        await fs.unlink(logPath);

        for (const file of result.outputFiles) {
          const name = path.basename(file);
          const type = inferArtifactType(name);
          await state.artifactRegistry.register(params.experimentId, type, name, file, { source: "experiment_run" });
        }

        const runStatus = result.exitCode === 0 ? "completed" : "failed";
        await state.experimentStore.updateStatus(params.experimentId, runStatus);

        return {
          content: [{ type: "text", text: `Experiment ${runStatus}. Exit code: ${result.exitCode}. Outputs: ${result.outputFiles.length} files.` }],
          details: { exitCode: result.exitCode, outputCount: result.outputFiles.length },
        };
      } catch (err) {
        await state.experimentStore.updateStatus(params.experimentId, "failed");
        throw err;
      }
    },
  });
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
