export interface CVFold {
  fold: number;
  trainIndices: number[];
  valIndices: number[];
  trainSize: number;
  valSize: number;
  trainClassDistribution?: Record<string, number>;
  valClassDistribution?: Record<string, number>;
}

export interface CVOptions {
  rowCount: number;
  labels?: (string | number)[];
  groups?: string[];
  strategy: "stratified_kfold" | "kfold" | "group_kfold" | "time_series_split";
  nSplits: number;
  seed?: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffleArray<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function computeDistribution(indices: number[], labels: (string | number)[]): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const idx of indices) {
    const label = String(labels[idx]);
    dist[label] = (dist[label] || 0) + 1;
  }
  return dist;
}

function stratifiedSplit(
  rowCount: number,
  labels: (string | number)[],
  nSplits: number,
  rand: () => number,
): CVFold[] {
  const classIndices: Record<string, number[]> = {};
  for (let i = 0; i < rowCount; i++) {
    const label = String(labels[i]);
    if (!classIndices[label]) classIndices[label] = [];
    classIndices[label].push(i);
  }

  for (const cls of Object.keys(classIndices)) {
    if (classIndices[cls].length < nSplits) {
      throw new Error(`Class "${cls}" has only ${classIndices[cls].length} samples, need at least ${nSplits} for stratified ${nSplits}-fold split`);
    }
  }

  // Shuffle ONCE per class
  for (const cls of Object.keys(classIndices)) {
    classIndices[cls] = shuffleArray(classIndices[cls], rand);
  }

  const folds: CVFold[] = [];
  for (let fold = 0; fold < nSplits; fold++) {
    const trainIndices: number[] = [];
    const valIndices: number[] = [];

    for (const cls of Object.keys(classIndices)) {
      const shuffled = classIndices[cls];  // Use pre-shuffled
      const foldSize = Math.floor(shuffled.length / nSplits);
      const start = fold * foldSize;
      const end = fold === nSplits - 1 ? shuffled.length : (fold + 1) * foldSize;

      valIndices.push(...shuffled.slice(start, end));
      trainIndices.push(...shuffled.slice(0, start), ...shuffled.slice(end));
    }

    folds.push({
      fold,
      trainIndices,
      valIndices,
      trainSize: trainIndices.length,
      valSize: valIndices.length,
      trainClassDistribution: computeDistribution(trainIndices, labels),
      valClassDistribution: computeDistribution(valIndices, labels),
    });
  }
  return folds;
}

function kfoldSplit(rowCount: number, nSplits: number, rand: () => number): CVFold[] {
  const indices = shuffleArray(Array.from({ length: rowCount }, (_, i) => i), rand);
  const foldSize = Math.floor(rowCount / nSplits);
  const folds: CVFold[] = [];

  for (let fold = 0; fold < nSplits; fold++) {
    const start = fold * foldSize;
    const end = fold === nSplits - 1 ? rowCount : (fold + 1) * foldSize;
    const valIndices = indices.slice(start, end);
    const trainIndices = [...indices.slice(0, start), ...indices.slice(end)];

    folds.push({
      fold,
      trainIndices,
      valIndices,
      trainSize: trainIndices.length,
      valSize: valIndices.length,
    });
  }
  return folds;
}

function groupKfoldSplit(rowCount: number, groups: string[], nSplits: number, rand: () => number): CVFold[] {
  const groupMap: Record<string, number[]> = {};
  for (let i = 0; i < rowCount; i++) {
    const g = groups[i];
    if (!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(i);
  }

  const uniqueGroups = shuffleArray(Object.keys(groupMap), rand);

  if (uniqueGroups.length < nSplits) {
    throw new Error(`Only ${uniqueGroups.length} unique groups, need at least ${nSplits} for ${nSplits}-fold group split`);
  }

  const foldSize = Math.floor(uniqueGroups.length / nSplits);
  const folds: CVFold[] = [];

  for (let fold = 0; fold < nSplits; fold++) {
    const start = fold * foldSize;
    const end = fold === nSplits - 1 ? uniqueGroups.length : (fold + 1) * foldSize;
    const valGroups = uniqueGroups.slice(start, end);
    const valIndices: number[] = [];
    const trainIndices: number[] = [];

    const valGroupSet = new Set(valGroups);
    for (const g of uniqueGroups) {
      if (valGroupSet.has(g)) {
        valIndices.push(...groupMap[g]);
      } else {
        trainIndices.push(...groupMap[g]);
      }
    }

    folds.push({
      fold,
      trainIndices,
      valIndices,
      trainSize: trainIndices.length,
      valSize: valIndices.length,
    });
  }
  return folds;
}

function timeSeriesSplit(rowCount: number, nSplits: number): CVFold[] {
  const valSize = Math.floor(rowCount / (nSplits + 1));
  if (valSize < 1) {
    throw new Error(`Dataset too small (${rowCount} rows) for ${nSplits} time-series splits (need at least ${nSplits + 1} rows)`);
  }

  const folds: CVFold[] = [];
  for (let fold = 1; fold <= nSplits; fold++) {
    const splitPoint = Math.floor((rowCount * fold) / (nSplits + 1));
    const trainIndices = Array.from({ length: splitPoint }, (_, i) => i);
    const valIndices = Array.from({ length: valSize }, (_, i) => splitPoint + i);

    folds.push({
      fold: fold - 1,
      trainIndices,
      valIndices,
      trainSize: trainIndices.length,
      valSize: valIndices.length,
    });
  }
  return folds;
}

export function generateFolds(options: CVOptions): CVFold[] {
  const { rowCount, labels, groups, strategy, nSplits, seed = 42 } = options;

  if (!Number.isInteger(nSplits) || nSplits <= 0) {
    throw new Error(`nSplits must be a positive integer, got ${nSplits}`);
  }

  if (rowCount < nSplits) {
    throw new Error(`Dataset too small (${rowCount} rows) for ${nSplits} splits`);
  }

  const rand = seededRandom(seed);

  switch (strategy) {
    case "stratified_kfold": {
      if (!labels || labels.length !== rowCount) {
        throw new Error("stratified_kfold requires labels matching rowCount");
      }
      return stratifiedSplit(rowCount, labels, nSplits, rand);
    }
    case "kfold":
      return kfoldSplit(rowCount, nSplits, rand);
    case "group_kfold": {
      if (!groups || groups.length !== rowCount) {
        throw new Error("group_kfold requires groups matching rowCount");
      }
      return groupKfoldSplit(rowCount, groups, nSplits, rand);
    }
    case "time_series_split":
      return timeSeriesSplit(rowCount, nSplits);
    default:
      throw new Error(`Invalid strategy: ${strategy}. Valid: stratified_kfold, kfold, group_kfold, time_series_split`);
  }
}
