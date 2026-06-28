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

describe("Experiment Tools Integration", () => {
  let tmpDir: string;
  let state: SessionState;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-tools-"));
    state = {
      artifactRegistry: new ArtifactRegistry(path.join(tmpDir, ".ml-agent")),
      experimentStore: new ExperimentStore(path.join(tmpDir, ".ml-agent", "experiments.jsonl")),
      runner: new LocalRunner(),
      deepSearch: new DeepSearch(
        [new ArxivSource(), new WebSource()],
        path.join(tmpDir, ".ml-agent", "search-cache"),
      ),
    };
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
});
