import * as path from "node:path";
import * as fs from "node:fs/promises";
import { Type } from "typebox";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { SessionState } from "../types/settings.js";

export function registerCodeTools(pi: ExtensionAPI, getState: (ctx: any) => SessionState) {
  pi.registerTool({
    name: "code_snapshot",
    label: "Code Snapshot",
    description: "Snapshot the current codebase as an artifact",
    parameters: Type.Object({
      experimentId: Type.String({ description: "Experiment ID to associate with" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const state = getState(ctx);
      const cwd = ctx.cwd;
      const isGit = await fs.access(path.join(cwd, ".git")).then(() => true).catch(() => false);
      let content: string;
      if (isGit) {
        const { spawnSync } = await import("node:child_process");
        const result = spawnSync("git", ["diff", "HEAD"], { cwd, encoding: "utf-8" });
        content = result.stdout || "(no changes)";
      } else {
        content = "Not a git repository. Manual snapshot required.";
      }
      const tmpPath = path.join(cwd, `.ml-agent/tmp-snapshot-${Date.now()}.diff`);
      await fs.mkdir(path.dirname(tmpPath), { recursive: true });
      await fs.writeFile(tmpPath, content);
      const art = await state.artifactRegistry.register(params.experimentId, "code", "snapshot.diff", tmpPath, { source: "code_snapshot" });
      await fs.unlink(tmpPath);
      return {
        content: [{ type: "text", text: `Code snapshot registered: ${art.id}` }],
        details: { artifactId: art.id },
      };
    },
  });
}
