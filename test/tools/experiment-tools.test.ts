import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ArtifactRegistry } from "../../src/store/artifact-registry.js";
import { ExperimentStore } from "../../src/store/experiment-store.js";
import { LocalRunner } from "../../src/runner/local-runner.js";
import { DeepSearch } from "../../src/search/deep-search.js";
import { ArxivSource } from "../../src/search/sources/arxiv-source.js";
import { WebSource } from "../../src/search/sources/web-source.js";
import type { SessionState } from "../../src/types/settings.js";
import { Journal } from "../../src/memory/journal.js";
import { InvestigationManager } from "../../src/investigation/manager.js";
import { registerExperimentTools } from "../../src/tools/experiment-tools.js";

describe("Experiment Tools Integration", () => {
  let tmpDir: string;
  let state: SessionState;
  let journal: Journal;
  let manager: InvestigationManager;
  const registeredTools: Map<string, any> = new Map();

  const mockPi = {
    registerTool(tool: any) {
      registeredTools.set(tool.name, tool);
    },
  } as any;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-tools-"));
    const base = path.join(tmpDir, ".cache", "ml-agent");
    state = {
      artifactRegistry: new ArtifactRegistry(base),
      experimentStore: new ExperimentStore(path.join(base, "experiments.jsonl")),
      runner: new LocalRunner(),
      deepSearch: new DeepSearch(
        [new ArxivSource(), new WebSource()],
        path.join(base, "search-cache"),
      ),
    };
    journal = new Journal(path.join(base, "journal"));
    manager = new InvestigationManager(
      path.join(base, "investigations"),
      journal,
      state.experimentStore,
    );
    registeredTools.clear();
    registerExperimentTools(
      mockPi,
      () => state,
      () => journal,
      () => manager,
    );
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates and tracks an experiment", async () => {
    const exp = await state.experimentStore.create({
      id: "exp1",
      name: "test",
      hyperparameters: { lr: 0.01 },
      status: "planned",
    });

    expect(exp.id).toBe("exp1");

    await state.experimentStore.updateStatus("exp1", "running");
    const updated = await state.experimentStore.get("exp1");
    expect(updated!.status).toBe("running");
  });

  it("registers artifacts and lists them", async () => {
    const p = path.join(tmpDir, "model.pt");
    await fs.writeFile(p, "fake model");

    await state.artifactRegistry.register("exp1", "model", "model.pt", p);
    await state.artifactRegistry.register("exp1", "log", "train.log", p);

    const arts = await state.artifactRegistry.list("exp1");
    expect(arts).toHaveLength(2);

    const logs = await state.artifactRegistry.list("exp1", "log");
    expect(logs).toHaveLength(1);
  });

  it("runs a simple command", async () => {
    const result = await state.runner.run({
      experimentId: "exp1",
      command: "echo hello",
      workingDir: tmpDir,
      timeoutSeconds: 10,
      outputPatterns: [],
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello");
  });

  it("runs env-prefix and && commands via shell", async () => {
    const result = await state.runner.run({
      experimentId: "t1",
      command: "export FOO=bar; echo $FOO && echo ok",
      workingDir: tmpDir,
      timeoutSeconds: 30,
      outputPatterns: [],
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/bar/);
    expect(result.stdout).toMatch(/ok/);
  });

  it("runs env assignment for child process (OMP-style)", async () => {
    const result = await state.runner.run({
      experimentId: "t1b",
      command: "OMP_NUM_THREADS=2 python3 -c 'import os; print(os.environ.get(\"OMP_NUM_THREADS\"))'",
      workingDir: tmpDir,
      timeoutSeconds: 30,
      outputPatterns: [],
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/2/);
  });

  it("runs cd in command when using shell", async () => {
    const result = await state.runner.run({
      experimentId: "t2",
      command: "cd /tmp && pwd",
      workingDir: process.cwd(),
      timeoutSeconds: 30,
      outputPatterns: [],
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toMatch(/tmp/);
  });

  it("list action works without experimentId", async () => {
    const tool = registeredTools.get("experiment_track");
    await tool.execute("c1", {
      action: "create",
      experimentId: "e1",
      name: "n1",
    }, null, null, { cwd: tmpDir });

    const result = await tool.execute("c2", { action: "list" }, null, null, { cwd: tmpDir });
    expect(result.details.count).toBe(1);
    expect(result.content[0].text).toContain("e1");
  });

  it("dual-writes create to journal when investigation active", async () => {
    const invId = await manager.create("goal", "data.csv", "regression");
    const tool = registeredTools.get("experiment_track");
    await tool.execute("c1", {
      action: "create",
      experimentId: "exp-dual",
      name: "dual",
      hyperparameters: { model: "lgbm", lr: 0.1 },
    }, null, null, { cwd: tmpDir });

    const jexps = await journal.getExperiments({ investigationId: invId });
    expect(jexps.some((e) => e.id === "exp-dual")).toBe(true);

    const inv = await manager.load(invId);
    expect(inv.experiments.some((e) => e.id === "exp-dual")).toBe(true);
  });

  it("experiment_run auto-creates missing experiment", async () => {
    const tool = registeredTools.get("experiment_run");
    const result = await tool.execute("c1", {
      experimentId: "auto-exp",
      command: "echo ran",
      workingDir: tmpDir,
      timeoutSeconds: 30,
      outputPatterns: [],
    }, null, null, { cwd: tmpDir });

    expect(result.details.exitCode).toBe(0);
    const exp = await state.experimentStore.get("auto-exp");
    expect(exp).toBeDefined();
    expect(exp!.status).toBe("completed");
  });
});
