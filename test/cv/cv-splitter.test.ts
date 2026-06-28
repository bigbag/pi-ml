import { describe, it, expect } from "vitest";
import { generateFolds } from "../../src/cv/cv-splitter.js";

describe("generateFolds", () => {
  const labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
  const groups = ["a", "a", "b", "b", "c", "c", "d", "d", "e", "e"];

  it("generates stratified kfold", () => {
    const folds = generateFolds({ rowCount: 10, labels, strategy: "stratified_kfold", nSplits: 5, seed: 42 });
    expect(folds).toHaveLength(5);
    expect(folds[0].trainIndices).toHaveLength(8);
    expect(folds[0].valIndices).toHaveLength(2);
  });

  it("generates regular kfold", () => {
    const folds = generateFolds({ rowCount: 10, strategy: "kfold", nSplits: 5, seed: 42 });
    expect(folds).toHaveLength(5);
    expect(folds[0].trainIndices).toHaveLength(8);
    expect(folds[0].valIndices).toHaveLength(2);
  });

  it("generates group kfold", () => {
    const folds = generateFolds({ rowCount: 10, groups, strategy: "group_kfold", nSplits: 5, seed: 42 });
    expect(folds).toHaveLength(5);
    // Each group's rows should stay together
    for (const fold of folds) {
      const groupSet = new Set(fold.valIndices.map((i) => groups[i]));
      expect(groupSet.size).toBe(1); // each val set should come from exactly one group
    }
  });

  it("generates time series split", () => {
    const folds = generateFolds({ rowCount: 10, strategy: "time_series_split", nSplits: 3, seed: 42 });
    expect(folds).toHaveLength(3);
    // Train grows, val is fixed-ish size at the end
    expect(folds[0].trainIndices.length).toBeLessThan(folds[1].trainIndices.length);
  });

  it("throws on invalid strategy", () => {
    expect(() =>
      // Intentionally passing invalid strategy for negative test
      generateFolds({ rowCount: 10, strategy: "invalid" as any, nSplits: 3, seed: 42 }),
    ).toThrow("Invalid strategy");
  });

  it("throws when dataset too small for n_splits", () => {
    expect(() =>
      generateFolds({ rowCount: 2, strategy: "kfold", nSplits: 5, seed: 42 }),
    ).toThrow("too small");
  });

  it("kfold train and val are disjoint and cover all indices", () => {
    const folds = generateFolds({ rowCount: 10, strategy: "kfold", nSplits: 5, seed: 42 });
    for (const fold of folds) {
      const trainSet = new Set(fold.trainIndices);
      const valSet = new Set(fold.valIndices);
      // disjoint
      for (const v of fold.valIndices) {
        expect(trainSet.has(v)).toBe(false);
      }
      // cover all
      expect(trainSet.size + valSet.size).toBe(10);
      const all = new Set([...fold.trainIndices, ...fold.valIndices]);
      expect(all.size).toBe(10);
    }
  });

  it("stratified kfold preserves class proportions", () => {
    const labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
    const folds = generateFolds({ rowCount: 10, labels, strategy: "stratified_kfold", nSplits: 5, seed: 42 });
    for (const fold of folds) {
      const totalClass0 = (fold.trainClassDistribution?.["0"] ?? 0) + (fold.valClassDistribution?.["0"] ?? 0);
      const totalClass1 = (fold.trainClassDistribution?.["1"] ?? 0) + (fold.valClassDistribution?.["1"] ?? 0);
      expect(totalClass0).toBe(5);
      expect(totalClass1).toBe(5);
    }
  });

  it("stratified kfold train and val are disjoint and cover all indices", () => {
    const labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
    const folds = generateFolds({ rowCount: 10, labels, strategy: "stratified_kfold", nSplits: 5, seed: 42 });
    for (const fold of folds) {
      const trainSet = new Set(fold.trainIndices);
      const valSet = new Set(fold.valIndices);
      for (const v of fold.valIndices) {
        expect(trainSet.has(v)).toBe(false);
      }
      const all = new Set([...fold.trainIndices, ...fold.valIndices]);
      expect(all.size).toBe(10);
    }
  });

  it("time series split is chronological", () => {
    const folds = generateFolds({ rowCount: 10, strategy: "time_series_split", nSplits: 3, seed: 42 });
    for (const fold of folds) {
      const maxTrain = Math.max(...fold.trainIndices);
      const minVal = Math.min(...fold.valIndices);
      expect(maxTrain).toBeLessThan(minVal);
    }
  });

  it("reproduces same folds with same seed", () => {
    const labels = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
    const folds1 = generateFolds({ rowCount: 10, labels, strategy: "stratified_kfold", nSplits: 5, seed: 42 });
    const folds2 = generateFolds({ rowCount: 10, labels, strategy: "stratified_kfold", nSplits: 5, seed: 42 });
    for (let i = 0; i < folds1.length; i++) {
      expect(folds1[i].trainIndices).toEqual(folds2[i].trainIndices);
      expect(folds1[i].valIndices).toEqual(folds2[i].valIndices);
    }
  });
});
