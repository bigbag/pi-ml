import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ExperimentStore } from "../../src/store/experiment-store.js";

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

  it("upserts on create with same id", async () => {
    await store.create({ id: "exp1", name: "baseline", status: "planned" });
    await store.create({ id: "exp1", name: "baseline-v2", status: "running", results: { loss: 1 } });
    const all = await store.list();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("baseline-v2");
    expect(all[0].status).toBe("running");
    expect(all[0].results).toEqual({ loss: 1 });
  });

  it("getOrCreate returns existing", async () => {
    await store.create({ id: "exp1", name: "a", status: "planned" });
    const exp = await store.getOrCreate("exp1", { name: "b" });
    expect(exp.name).toBe("a");
  });

  it("getOrCreate creates missing", async () => {
    const exp = await store.getOrCreate("exp-new", { name: "fresh", investigationId: "inv-1" });
    expect(exp.id).toBe("exp-new");
    expect(exp.investigationId).toBe("inv-1");
  });

  it("serializes concurrent status updates", async () => {
    await store.create({ id: "exp1", name: "a", status: "planned" });
    await Promise.all([
      store.updateStatus("exp1", "running"),
      store.update("exp1", { results: { a: 1 } }),
      store.update("exp1", { hyperparameters: { lr: 0.1 } }),
    ]);
    const exp = await store.get("exp1");
    expect(exp).toBeDefined();
    expect(exp!.id).toBe("exp1");
  });

  it("filters list by investigationId", async () => {
    await store.create({ id: "e1", name: "a", investigationId: "inv-a" });
    await store.create({ id: "e2", name: "b", investigationId: "inv-b" });
    const list = await store.list({ investigationId: "inv-a" });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("e1");
  });
});
