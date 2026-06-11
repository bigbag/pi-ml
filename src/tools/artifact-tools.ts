import { Type } from "typebox";
import * as fs from "node:fs/promises";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types.js";

export function registerArtifactTools(pi: ExtensionAPI, getState: (ctx: any) => SessionState) {
  pi.registerTool({
    name: "artifact_list",
    label: "List Artifacts",
    description: "List artifacts for an experiment",
    parameters: Type.Object({
      experimentId: Type.String(),
      type: Type.Optional(Type.Union([
        Type.Literal("model"),
        Type.Literal("checkpoint"),
        Type.Literal("log"),
        Type.Literal("config"),
        Type.Literal("prediction"),
        Type.Literal("plot"),
        Type.Literal("dataset"),
        Type.Literal("report"),
        Type.Literal("code"),
      ])),
      tag: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const arts = await state.artifactRegistry.list(params.experimentId, params.type, params.tag);
      const lines = arts.map((a) => `${a.id} [${a.type}] ${a.name} (${new Date(a.createdAt).toISOString()})`);
      return {
        content: [{ type: "text", text: lines.join("\n") || "No artifacts found." }],
        details: { count: arts.length },
      };
    },
  });

  pi.registerTool({
    name: "artifact_get",
    label: "Get Artifact",
    description: "Retrieve an artifact by ID",
    parameters: Type.Object({
      artifactId: Type.String(),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const art = await state.artifactRegistry.get(params.artifactId);
      if (!art) throw new Error(`Artifact not found: ${params.artifactId}`);
      const content = await state.artifactRegistry.read(art.id).then((b) => b.toString("utf-8")).catch(() => "(binary or unreadable)");
      return {
        content: [{ type: "text", text: `Artifact: ${art.name} [${art.type}]\n${content.slice(0, 10000)}` }],
        details: { artifact: art },
      };
    },
  });

  pi.registerTool({
    name: "artifact_compare",
    label: "Compare Artifacts",
    description: "Compare two artifacts",
    parameters: Type.Object({
      artifactIdA: Type.String(),
      artifactIdB: Type.String(),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const a = await state.artifactRegistry.get(params.artifactIdA);
      const b = await state.artifactRegistry.get(params.artifactIdB);
      if (!a || !b) throw new Error("One or both artifacts not found");
      const contentA = await state.artifactRegistry.read(a.id).then((b) => b.toString("utf-8")).catch(() => "(binary)");
      const contentB = await state.artifactRegistry.read(b.id).then((b) => b.toString("utf-8")).catch(() => "(binary)");
      const linesA = contentA.split("\n");
      const linesB = contentB.split("\n");
      const maxLen = Math.max(linesA.length, linesB.length);
      const diffs: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        if (linesA[i] !== linesB[i]) {
          diffs.push(`Line ${i + 1}:\n- ${linesA[i] || ""}\n+ ${linesB[i] || ""}`);
        }
      }
      return {
        content: [{ type: "text", text: diffs.slice(0, 50).join("\n\n") || "No differences found." }],
        details: { diffCount: diffs.length },
      };
    },
  });

  pi.registerTool({
    name: "artifact_tag",
    label: "Tag Artifact",
    description: "Add or remove tags from an artifact",
    parameters: Type.Object({
      artifactId: Type.String(),
      tags: Type.Array(Type.String()),
      action: Type.Union([Type.Literal("add"), Type.Literal("remove")]),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      for (const tag of params.tags) {
        if (params.action === "add") {
          await state.artifactRegistry.addTag(params.artifactId, tag);
        } else {
          await state.artifactRegistry.removeTag(params.artifactId, tag);
        }
      }
      return {
        content: [{ type: "text", text: `Tags ${params.action}ed: ${params.tags.join(", ")}` }],
        details: { tags: params.tags, action: params.action },
      };
    },
  });
}
