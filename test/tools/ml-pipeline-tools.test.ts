import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ArtifactRegistry } from "../../src/core/artifact-registry.js";
import { ExperimentStore } from "../../src/core/experiment-store.js";
import { LocalRunner } from "../../src/core/local-runner.js";
import { DeepSearch } from "../../src/search/deep-search.js";
import { ArxivSource } from "../../src/search/sources/arxiv-source.js";
import { WebSource } from "../../src/search/sources/web-source.js";
import type { SessionState } from "../../src/types.js";
import { registerPipelineTools } from "../../src/tools/ml-pipeline-tools.js";

function createMockPi(state: SessionState) {
  const tools: Record<string, any> = {};
  const commands: Record<string, any> = {};
  return {
    registerTool: (def: any) => { tools[def.name] = def; },
    registerCommand: (name: string, def: any) => { commands[name] = def; },
    tools,
    commands,
  };
}

function createMockCtx(tmpDir: string) {
  return {
    cwd: tmpDir,
    sessionManager: { getSessionId: () => "test-session" },
    ui: { notify: () => {} },
  };
}

describe("ML Pipeline Tools", () => {
  let tmpDir: string;
  let state: SessionState;
  let pi: ReturnType<typeof createMockPi>;
  let ctx: ReturnType<typeof createMockCtx>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-pipeline-"));
    state = {
      artifactRegistry: new ArtifactRegistry(path.join(tmpDir, ".ml-agent")),
      experimentStore: new ExperimentStore(path.join(tmpDir, ".ml-agent", "experiments.jsonl")),
      runner: new LocalRunner(),
      deepSearch: new DeepSearch(
        [new ArxivSource(), new WebSource()],
        path.join(tmpDir, ".ml-agent", "search-cache"),
      ),
    };
    pi = createMockPi(state);
    ctx = createMockCtx(tmpDir);
    registerPipelineTools(pi as any, () => state);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("registers all 3 pipeline tools", () => {
    expect(pi.tools["dataset_profile"]).toBeDefined();
    expect(pi.tools["cv_manager"]).toBeDefined();
    expect(pi.tools["experiment_diff"]).toBeDefined();
  });

  it("dataset_profile profiles a CSV", async () => {
    const csvPath = path.join(tmpDir, "data.csv");
    await fs.writeFile(csvPath, "a,b\n1,x\n2,y\n");
    await state.experimentStore.create({ id: "exp1", name: "test", status: "planned" });

    const result = await pi.tools["dataset_profile"].execute("tc1", { experimentId: "exp1", datasetPath: csvPath }, undefined, undefined, ctx);

    expect(result.content[0].text).toContain("a");
    expect(result.content[0].text).toContain("b");
    expect(result.details.profile).toBeDefined();
    expect(result.details.profile.rowCount).toBe(2);
  });

  it("cv_manager generates folds", async () => {
    const csvPath = path.join(tmpDir, "data.csv");
    await fs.writeFile(csvPath, "feat,target\n1,0\n2,0\n3,1\n4,1\n");
    await state.experimentStore.create({ id: "exp1", name: "test", status: "planned" });

    const result = await pi.tools["cv_manager"].execute("tc2", {
      experimentId: "exp1",
      datasetPath: csvPath,
      targetColumn: "target",
      strategy: "stratified_kfold",
      nSplits: 2,
      seed: 42,
    }, undefined, undefined, ctx);

    expect(result.content[0].text).toContain("Fold 0");
    expect(result.details.folds).toHaveLength(2);
  });

  it("experiment_diff compares two experiments", async () => {
    await state.experimentStore.create({ id: "expA", name: "A", status: "planned", hyperparameters: { lr: 0.01 }, codeArtifactId: "", configArtifactId: "" });
    await state.experimentStore.create({ id: "expB", name: "B", status: "planned", hyperparameters: { lr: 0.001 }, codeArtifactId: "", configArtifactId: "" });

    const codeA = path.join(tmpDir, "codeA.py");
    const codeB = path.join(tmpDir, "codeB.py");
    await fs.writeFile(codeA, "import torch\n");
    await fs.writeFile(codeB, "import tensorflow\n");
    const artA = await state.artifactRegistry.register("expA", "code", "code.py", codeA);
    const artB = await state.artifactRegistry.register("expB", "code", "code.py", codeB);
    await state.experimentStore.update("expA", { codeArtifactId: artA.id });
    await state.experimentStore.update("expB", { codeArtifactId: artB.id });

    const result = await pi.tools["experiment_diff"].execute("tc3", { experimentIdA: "expA", experimentIdB: "expB" }, undefined, undefined, ctx);

    expect(result.content[0].text).toContain("torch");
    expect(result.content[0].text).toContain("tensorflow");
  });

  it("dataset_profile handles missing file", async () => {
    await state.experimentStore.create({ id: "exp1", name: "test", status: "planned" });

    await expect(
      pi.tools["dataset_profile"].execute("tc4", { experimentId: "exp1", datasetPath: "/nonexistent.csv" }, undefined, undefined, ctx),
    ).rejects.toThrow("not found");
  });

  it("experiment_diff handles missing experiment", async () => {
    await expect(
      pi.tools["experiment_diff"].execute("tc5", { experimentIdA: "missing", experimentIdB: "also-missing" }, undefined, undefined, ctx),
    ).rejects.toThrow("not found");
  });
});
