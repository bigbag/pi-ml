import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { ArtifactRegistry } from "../../src/store/artifact-registry.js";

describe("ArtifactRegistry", () => {
  let tmpDir: string;
  let registry: ArtifactRegistry;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-artifact-"));
    registry = new ArtifactRegistry(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("registers an artifact", async () => {
    const artifactPath = path.join(tmpDir, "test.txt");
    await fs.writeFile(artifactPath, "hello world");

    const art = await registry.register("exp1", "model", "test.pt", artifactPath);

    expect(art.experimentId).toBe("exp1");
    expect(art.type).toBe("model");
    expect(art.name).toBe("test.pt");
    expect(art.size).toBe(11);
  });

  it("lists artifacts by experiment", async () => {
    const p1 = path.join(tmpDir, "a.txt");
    const p2 = path.join(tmpDir, "b.txt");
    await fs.writeFile(p1, "a");
    await fs.writeFile(p2, "b");

    await registry.register("exp1", "model", "a.pt", p1);
    await registry.register("exp1", "log", "b.log", p2);
    await registry.register("exp2", "model", "c.pt", p1);

    const arts = await registry.list("exp1");
    expect(arts).toHaveLength(2);
    expect(arts.every((a) => a.experimentId === "exp1")).toBe(true);
  });

  it("filters by type", async () => {
    const p = path.join(tmpDir, "x.txt");
    await fs.writeFile(p, "x");

    await registry.register("exp1", "model", "a.pt", p);
    await registry.register("exp1", "log", "b.log", p);

    const models = await registry.list("exp1", "model");
    expect(models).toHaveLength(1);
    expect(models[0].type).toBe("model");
  });

  it("gets artifact by id", async () => {
    const p = path.join(tmpDir, "x.txt");
    await fs.writeFile(p, "x");

    const art = await registry.register("exp1", "model", "a.pt", p);
    const fetched = await registry.get(art.id);

    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(art.id);
  });

  it("adds and removes tags", async () => {
    const p = path.join(tmpDir, "x.txt");
    await fs.writeFile(p, "x");

    const art = await registry.register("exp1", "model", "a.pt", p);
    await registry.addTag(art.id, "baseline");
    await registry.addTag(art.id, "v1");

    let fetched = await registry.get(art.id);
    expect(fetched!.tags).toContain("baseline");
    expect(fetched!.tags).toContain("v1");

    await registry.removeTag(art.id, "v1");
    fetched = await registry.get(art.id);
    expect(fetched!.tags).toContain("baseline");
    expect(fetched!.tags).not.toContain("v1");
  });

  it("compares two artifacts", async () => {
    const p1 = path.join(tmpDir, "a.txt");
    const p2 = path.join(tmpDir, "b.txt");
    await fs.writeFile(p1, "line1\nline2");
    await fs.writeFile(p2, "line1\nline3");

    const a = await registry.register("exp1", "log", "a.log", p1);
    const b = await registry.register("exp1", "log", "b.log", p2);

    const diff = await registry.compare(a.id, b.id);
    expect(diff.type).toBe("text");
    expect(diff.diffs).toHaveLength(1);
    expect(diff.diffs[0].lineA).toBe(2);
  });
});
