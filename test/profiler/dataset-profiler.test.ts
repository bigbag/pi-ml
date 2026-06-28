import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { profileDataset } from "../../src/profiler/dataset-profiler.js";

const fixturesDir = path.join(import.meta.dirname, "../fixtures");

describe("profileDataset", () => {
  it("profiles a CSV with mixed types", async () => {
    const profile = await profileDataset(path.join(fixturesDir, "sample.csv"));

    expect(profile.rowCount).toBe(5);
    expect(profile.columnCount).toBe(4);

    const ageCol = profile.columns.find((c) => c.name === "age");
    expect(ageCol).toBeDefined();
    expect(ageCol!.inferredType).toBe("numeric");
    expect(ageCol!.mean).toBe(30);

    const nameCol = profile.columns.find((c) => c.name === "name");
    expect(nameCol!.inferredType).toBe("categorical");

    const activeCol = profile.columns.find((c) => c.name === "active");
    expect(activeCol!.inferredType).toBe("boolean");
  });

  it("profiles a JSON array", async () => {
    const profile = await profileDataset(path.join(fixturesDir, "sample.json"));

    expect(profile.rowCount).toBe(3);
    expect(profile.columns.some((c) => c.name === "value")).toBe(true);
  });

  it("detects target column type (binary classification)", async () => {
    const profile = await profileDataset(
      path.join(fixturesDir, "sample-classification.csv"),
      { targetColumn: "target" },
    );

    expect(profile.targetAnalysis).toBeDefined();
    expect(profile.targetAnalysis!.type).toBe("binary");
    expect(profile.targetAnalysis!.classDistribution).toBeDefined();
    expect(profile.targetAnalysis!.classDistribution!["0"]).toBe(3);
    expect(profile.targetAnalysis!.classDistribution!["1"]).toBe(2);
  });

  it("throws on missing file", async () => {
    await expect(profileDataset("/nonexistent/file.csv")).rejects.toThrow("not found");
  });

  it("handles empty file gracefully", async () => {
    const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), "pi-ml-empty-"));
    const emptyPath = path.join(emptyDir, "empty.csv");
    try {
      await fs.writeFile(emptyPath, "");
      const profile = await profileDataset(emptyPath);
      expect(profile.rowCount).toBe(0);
      expect(profile.columnCount).toBe(0);
    } finally {
      await fs.rm(emptyDir, { recursive: true, force: true });
    }
  });
});
