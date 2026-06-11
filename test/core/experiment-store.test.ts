import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ExperimentStore } from "../../src/core/experiment-store.js";

describe("ExperimentStore", () => {
  let tmpDir: string;
  let store: ExperimentStore;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-exp-"));
    store = new ExperimentStore(path.join(tmpDir, "experiments.jsonl"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates an experiment", async () => {
    const exp = await store.create({
      id: "exp1",
      name: "baseline",
      hyperparameters: { lr: 0.001 },
      status: "planned",
    });

    expect(exp.id).toBe("exp1");
    expect(exp.name).toBe("baseline");
    expect(exp.status).toBe("planned");
  });

  it("gets an experiment", async () => {
    await store.create({ id: "exp1", name: "baseline", status: "planned" });
    const exp = await store.get("exp1");

    expect(exp).toBeDefined();
    expect(exp!.id).toBe("exp1");
  });

  it("updates an experiment", async () => {
    await store.create({ id: "exp1", name: "baseline", status: "planned" });
    await store.update("exp1", { status: "running", results: { loss: 0.5 } });

    const exp = await store.get("exp1");
    expect(exp!.status).toBe("running");
    expect(exp!.results).toEqual({ loss: 0.5 });
  });

  it("lists all experiments", async () => {
    await store.create({ id: "exp1", name: "a", status: "planned" });
    await store.create({ id: "exp2", name: "b", status: "completed" });

    const exps = await store.list();
    expect(exps).toHaveLength(2);
  });

  it("updates status", async () => {
    await store.create({ id: "exp1", name: "baseline", status: "planned" });
    await store.updateStatus("exp1", "running");

    const exp = await store.get("exp1");
    expect(exp!.status).toBe("running");
  });
});
