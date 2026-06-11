import { Type } from "typebox";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types.js";
import { profileDataset, parseCSV } from "../core/dataset-profiler.js";
import { generateFolds } from "../core/cv-splitter.js";

export function registerPipelineTools(pi: ExtensionAPI, getState: (ctx: any) => SessionState) {
  pi.registerTool({
    name: "dataset_profile",
    label: "Profile Dataset",
    description: "Analyze a dataset file and produce a structured profile with type inference, statistics, and correlations",
    promptSnippet: "Profile dataset to understand column types, distributions, and data quality",
    parameters: Type.Object({
      experimentId: Type.String({ description: "Experiment ID to associate the profile artifact with" }),
      datasetPath: Type.String({ description: "Path to CSV or JSON dataset file" }),
      targetColumn: Type.Optional(Type.String({ description: "Optional target column for classification/regression detection" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const profile = await profileDataset(params.datasetPath, { targetColumn: params.targetColumn });

      const profileJson = JSON.stringify(profile, null, 2);
      const tmpPath = path.join(ctx.cwd, `.ml-agent/tmp-profile-${Date.now()}.json`);
      let art;
      try {
        await fs.mkdir(path.dirname(tmpPath), { recursive: true });
        await fs.writeFile(tmpPath, profileJson);
        art = await state.artifactRegistry.register(params.experimentId, "report", "dataset-profile.json", tmpPath, {
          source: "dataset_profile",
        });
      } finally {
        await fs.unlink(tmpPath).catch(() => {});
      }

      const lines: string[] = [
        `Dataset Profile: ${path.basename(params.datasetPath)}`,
        `Rows: ${profile.rowCount} | Columns: ${profile.columnCount}`,
        "",
        "Columns:",
      ];
      for (const col of profile.columns) {
        let line = `  ${col.name} [${col.inferredType}]`;
        if (col.nullCount > 0) line += ` | nulls: ${col.nullCount} (${(col.nullRatio * 100).toFixed(1)}%)`;
        if (col.mean !== undefined) {
          const stdStr = col.std !== undefined ? col.std.toFixed(2) : "N/A";
          line += ` | mean: ${col.mean.toFixed(2)} std: ${stdStr}`;
        }
        if (col.topValues) line += ` | top: ${col.topValues.slice(0, 3).map((v) => `${v.value}(${v.count})`).join(", ")}`;
        lines.push(line);
      }

      if (profile.targetAnalysis) {
        lines.push("", `Target: ${params.targetColumn} [${profile.targetAnalysis.type}]`);
        if (profile.targetAnalysis.classDistribution) {
          lines.push("  Distribution: " + Object.entries(profile.targetAnalysis.classDistribution)
            .map(([k, v]) => `${k}=${v}`).join(", "));
        }
      }

      if (profile.correlations) {
        lines.push("", "Correlations (top pairs):");
        const pairs: string[] = [];
        const cols = Object.keys(profile.correlations);
        for (let i = 0; i < cols.length; i++) {
          for (let j = i + 1; j < cols.length; j++) {
            const r = profile.correlations[cols[i]][cols[j]];
            if (Math.abs(r) > 0.3) {
              pairs.push(`  ${cols[i]} ↔ ${cols[j]}: ${r.toFixed(3)}`);
            }
          }
        }
        lines.push(...pairs.slice(0, 10));
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { profile, artifactId: art.id },
      };
    },
  });

  pi.registerTool({
    name: "cv_manager",
    label: "Manage CV Folds",
    description: "Generate cross-validation fold definitions and track out-of-fold predictions",
    promptSnippet: "Create CV folds for a dataset",
    parameters: Type.Object({
      experimentId: Type.String({ description: "Experiment ID to associate fold artifact with" }),
      datasetPath: Type.String({ description: "Path to CSV dataset file" }),
      targetColumn: Type.String({ description: "Target column name" }),
      strategy: Type.Union([
        Type.Literal("stratified_kfold"),
        Type.Literal("kfold"),
        Type.Literal("group_kfold"),
        Type.Literal("time_series_split"),
      ]),
      nSplits: Type.Number({ description: "Number of folds", default: 5 }),
      groupColumn: Type.Optional(Type.String({ description: "Group column for group_kfold" })),
      seed: Type.Optional(Type.Number({ default: 42 })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);

      let content: string;
      try {
        content = await fs.readFile(params.datasetPath, "utf-8");
      } catch (err: any) {
        if (err.code === "ENOENT") {
          throw new Error(`Dataset file not found: ${params.datasetPath}`);
        }
        throw new Error(`Failed to read dataset ${params.datasetPath}: ${err.message}`);
      }
      const parsed = parseCSV(content);
      const headers = parsed.headers;
      const rows = parsed.rows;
      const rowCount = rows.length;

      const targetIdx = headers.indexOf(params.targetColumn);
      if (targetIdx === -1) throw new Error(`Target column not found: ${params.targetColumn}`);
      const labels = rows.map((r) => r[targetIdx]);

      let groups: string[] | undefined;
      if (params.strategy === "group_kfold") {
        if (!params.groupColumn) throw new Error("groupColumn required for group_kfold strategy");
        const groupIdx = headers.indexOf(params.groupColumn);
        if (groupIdx === -1) throw new Error(`Group column not found: ${params.groupColumn}`);
        groups = rows.map((r) => r[groupIdx]);
      }

      const folds = generateFolds({
        rowCount,
        labels,
        groups,
        strategy: params.strategy,
        nSplits: params.nSplits,
        seed: params.seed ?? 42,
      });

      const foldData = {
        strategy: params.strategy,
        nSplits: params.nSplits,
        seed: params.seed ?? 42,
        folds: folds.map((f) => ({
          fold: f.fold,
          trainSize: f.trainSize,
          valSize: f.valSize,
          trainIndices: f.trainIndices,
          valIndices: f.valIndices,
          trainClassDistribution: f.trainClassDistribution,
          valClassDistribution: f.valClassDistribution,
        })),
      };

      const tmpPath = path.join(ctx.cwd, `.ml-agent/tmp-folds-${Date.now()}.json`);
      let art;
      try {
        await fs.mkdir(path.dirname(tmpPath), { recursive: true });
        await fs.writeFile(tmpPath, JSON.stringify(foldData, null, 2));
        art = await state.artifactRegistry.register(params.experimentId, "dataset", "cv-folds.json", tmpPath, {
          source: "cv_manager",
        });
      } finally {
        await fs.unlink(tmpPath).catch(() => {});
      }

      const outputLines: string[] = [
        `CV Folds: ${params.strategy} | ${params.nSplits} splits`,
        `Dataset: ${rowCount} rows`,
        "",
      ];
      for (const fold of folds) {
        outputLines.push(`Fold ${fold.fold}: train=${fold.trainSize} val=${fold.valSize}`);
        if (fold.valClassDistribution) {
          outputLines.push(`  Val distribution: ${Object.entries(fold.valClassDistribution).map(([k, v]) => `${k}=${v}`).join(", ")}`);
        }
      }

      return {
        content: [{ type: "text", text: outputLines.join("\n") }],
        details: { folds, artifactId: art.id },
      };
    },
  });

  pi.registerTool({
    name: "experiment_diff",
    label: "Diff Experiments",
    description: "Compare two experiments side-by-side: code, config, hyperparameters, and results",
    promptSnippet: "Compare two experiments to see what changed",
    parameters: Type.Object({
      experimentIdA: Type.String(),
      experimentIdB: Type.String(),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);

      const expA = await state.experimentStore.get(params.experimentIdA);
      const expB = await state.experimentStore.get(params.experimentIdB);
      if (!expA) throw new Error(`Experiment not found: ${params.experimentIdA}`);
      if (!expB) throw new Error(`Experiment not found: ${params.experimentIdB}`);

      const lines: string[] = [`=== Experiment Diff: ${expA.id} vs ${expB.id} ===`, ""];

      // Code diff
      if (expA.codeArtifactId && expB.codeArtifactId) {
        try {
          const diff = await state.artifactRegistry.compare(expA.codeArtifactId, expB.codeArtifactId);
          lines.push("--- Code Diff ---");
          if (diff.type === "text") {
            for (const d of diff.diffs.slice(0, 30)) {
              lines.push(`Line ${d.lineA}:`);
              lines.push(`- ${d.before}`);
              lines.push(`+ ${d.after}`);
            }
            if (diff.diffs.length > 30) lines.push(`... (${diff.diffs.length - 30} more differences)`);
          } else {
            lines.push("(binary or unreadable artifacts)");
          }
          lines.push("");
        } catch {
          lines.push("--- Code Diff ---");
          lines.push("(could not compare code artifacts)");
          lines.push("");
        }
      } else {
        lines.push("--- Code Diff ---");
        lines.push(expA.codeArtifactId ? "(expB has no code artifact)" : expB.codeArtifactId ? "(expA has no code artifact)" : "(no code artifacts)");
        lines.push("");
      }

      // Config diff
      if (expA.configArtifactId && expB.configArtifactId) {
        try {
          const metaA = await state.artifactRegistry.get(expA.configArtifactId);
          const metaB = await state.artifactRegistry.get(expB.configArtifactId);
          if (metaA && metaB) {
            const bufA = await state.artifactRegistry.read(metaA.id);
            const bufB = await state.artifactRegistry.read(metaB.id);
            const cfgA = JSON.parse(bufA.toString("utf-8"));
            const cfgB = JSON.parse(bufB.toString("utf-8"));
            lines.push("--- Config Diff ---");
            const allKeys = new Set([...Object.keys(cfgA), ...Object.keys(cfgB)]);
            for (const key of allKeys) {
              if (!(key in cfgA)) lines.push(`+ ${key}: ${JSON.stringify(cfgB[key])}`);
              else if (!(key in cfgB)) lines.push(`- ${key}: ${JSON.stringify(cfgA[key])}`);
              else if (JSON.stringify(cfgA[key]) !== JSON.stringify(cfgB[key])) {
                lines.push(`  ${key}: ${JSON.stringify(cfgA[key])} → ${JSON.stringify(cfgB[key])}`);
              }
            }
            lines.push("");
          }
        } catch {
          lines.push("--- Config Diff ---");
          lines.push("(could not compare config artifacts)");
          lines.push("");
        }
      } else {
        lines.push("--- Config Diff ---");
        lines.push(expA.configArtifactId ? "(expB has no config artifact)" : expB.configArtifactId ? "(expA has no config artifact)" : "(no config artifacts)");
        lines.push("");
      }

      // Hyperparameter delta
      const hA = expA.hyperparameters || {};
      const hB = expB.hyperparameters || {};
      const allHKeys = new Set([...Object.keys(hA), ...Object.keys(hB)]);
      if (allHKeys.size > 0) {
        lines.push("--- Hyperparameters ---");
        const changed: string[] = [];
        for (const key of allHKeys) {
          const vA = key in hA ? String(hA[key]) : "(missing)";
          const vB = key in hB ? String(hB[key]) : "(missing)";
          const marker = vA !== vB ? " ← changed" : "";
          changed.push(`  ${key}: ${vA} | ${vB}${marker}`);
        }
        lines.push(...changed);
        lines.push("");
      }

      // Results comparison
      const rA = expA.results || {};
      const rB = expB.results || {};
      const allRKeys = new Set([...Object.keys(rA), ...Object.keys(rB)]);
      if (allRKeys.size > 0) {
        lines.push("--- Results ---");
        for (const key of allRKeys) {
          const vA = rA[key];
          const vB = rB[key];
          const sA = vA !== undefined ? Number(vA).toFixed(6) : "N/A";
          const sB = vB !== undefined ? Number(vB).toFixed(6) : "N/A";
          let delta = "";
          if (typeof vA === "number" && typeof vB === "number" && vA !== 0) {
            const pct = ((vB - vA) / vA) * 100;
            const arrow = pct < 0 && key.includes("loss") ? "↑" : pct > 0 && key.includes("acc") ? "↑" : pct < 0 && key.includes("acc") ? "↓" : pct > 0 && key.includes("loss") ? "↓" : "";
            delta = ` | ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% ${arrow}`;
          }
          lines.push(`  ${key}: ${sA} → ${sB}${delta}`);
        }
        lines.push("");
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { experimentA: expA.id, experimentB: expB.id },
      };
    },
  });
}
