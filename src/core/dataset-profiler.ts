import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface ColumnProfile {
  name: string;
  inferredType: "numeric" | "categorical" | "boolean" | "text" | "unknown";
  nullCount: number;
  nullRatio: number;
  uniqueCount: number;
  uniqueRatio: number;
  mean?: number;
  std?: number;
  topValues?: Array<{ value: string; count: number }>;
  sampleValues: unknown[];
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  correlations?: Record<string, Record<string, number>>;
  targetAnalysis?: {
    type: "binary" | "multiclass" | "regression";
    classDistribution?: Record<string, number>;
  };
}

export interface ProfileOptions {
  targetColumn?: string;
}

export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split("\n").map((l) => l.replace(/\r$/, "")).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(parseCSVLine);
  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function inferType(values: string[]): "numeric" | "categorical" | "boolean" | "text" | "unknown" {
  const nonNull = values.filter((v) => v !== "" && v.toLowerCase() !== "nan" && v.toLowerCase() !== "null");
  if (nonNull.length === 0) return "unknown";

  const boolPatterns = ["true", "false", "1", "0", "yes", "no"];
  const boolCount = nonNull.filter((v) => boolPatterns.includes(v.toLowerCase())).length;
  if (boolCount / nonNull.length > 0.9) return "boolean";

  const numericCount = nonNull.filter((v) => !isNaN(Number(v)) && v.trim() !== "").length;
  if (numericCount / nonNull.length > 0.9) return "numeric";

  const uniqueRatio = new Set(nonNull).size / nonNull.length;
  if (uniqueRatio > 0.9 && nonNull.every((v) => v.length > 20)) return "text";

  return "categorical";
}

function computeStats(values: string[], type: ColumnProfile["inferredType"]): Partial<ColumnProfile> {
  const nonNull = values.filter((v) => v !== "" && v.toLowerCase() !== "nan" && v.toLowerCase() !== "null");
  const nullCount = values.length - nonNull.length;
  const uniqueCount = new Set(nonNull).size;

  const result: Partial<ColumnProfile> = {
    nullCount,
    nullRatio: values.length > 0 ? nullCount / values.length : 0,
    uniqueCount,
    uniqueRatio: nonNull.length > 0 ? uniqueCount / nonNull.length : 0,
    sampleValues: nonNull.slice(0, 5),
  };

  if (type === "numeric") {
    const nums = nonNull.map(Number).filter((n) => !isNaN(n));
    if (nums.length > 0) {
      result.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((sum, n) => sum + (n - result.mean!) ** 2, 0) / nums.length;
      result.std = Math.sqrt(variance);
    }
  }

  if (type === "categorical" || type === "boolean") {
    const counts: Record<string, number> = {};
    for (const v of nonNull) {
      counts[v] = (counts[v] || 0) + 1;
    }
    result.topValues = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));
  }

  return result;
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function analyzeTarget(values: string[]): DatasetProfile["targetAnalysis"] {
  const nonNull = values.filter((v) => v !== "");
  const unique = [...new Set(nonNull)];
  const numericCount = nonNull.filter((v) => !isNaN(Number(v))).length;

  if (numericCount / nonNull.length > 0.9 && unique.length > 10) {
    return { type: "regression" };
  }

  const distribution: Record<string, number> = {};
  for (const v of nonNull) {
    distribution[v] = (distribution[v] || 0) + 1;
  }

  return {
    type: unique.length === 2 ? "binary" : "multiclass",
    classDistribution: distribution,
  };
}

export async function profileDataset(filePath: string, options?: ProfileOptions): Promise<DatasetProfile> {
  let content: string;
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read file ${filePath}: ${err.message}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  let headers: string[] = [];
  let rows: string[][] = [];

  if (ext === ".csv") {
    const parsed = parseCSV(content);
    headers = parsed.headers;
    rows = parsed.rows;
  } else if (ext === ".json") {
    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch (err: any) {
      throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
    }
    if (Array.isArray(data) && data.length > 0) {
      headers = Object.keys(data[0]);
      rows = data.map((obj) => headers.map((h) => String(obj[h] ?? "")));
    }
  } else {
    throw new Error(`Unsupported file format: ${ext}. Supported: .csv, .json`);
  }

  const columns: ColumnProfile[] = headers.map((name, colIdx) => {
    const values = rows.map((r) => r[colIdx]);
    const type = inferType(values);
    const stats = computeStats(values, type);
    return {
      name,
      inferredType: type,
      nullCount: stats.nullCount!,
      nullRatio: stats.nullRatio!,
      uniqueCount: stats.uniqueCount!,
      uniqueRatio: stats.uniqueRatio!,
      sampleValues: stats.sampleValues!,
      mean: stats.mean,
      std: stats.std,
      topValues: stats.topValues,
    };
  });

  const profile: DatasetProfile = {
    rowCount: rows.length,
    columnCount: headers.length,
    columns,
  };

  const numericCols = columns.filter((c) => c.inferredType === "numeric" && c.mean !== undefined);
  if (numericCols.length >= 2) {
    const correlations: Record<string, Record<string, number>> = {};
    for (let i = 0; i < numericCols.length; i++) {
      correlations[numericCols[i].name] = {};
      for (let j = 0; j < numericCols.length; j++) {
        const colI = headers.indexOf(numericCols[i].name);
        const colJ = headers.indexOf(numericCols[j].name);
        const pairs: Array<[number, number]> = [];
        for (const row of rows) {
          const x = Number(row[colI]);
          const y = Number(row[colJ]);
          if (!isNaN(x) && !isNaN(y)) {
            pairs.push([x, y]);
          }
        }
        if (pairs.length > 1) {
          const xs = pairs.map((p) => p[0]);
          const ys = pairs.map((p) => p[1]);
          correlations[numericCols[i].name][numericCols[j].name] = pearsonCorrelation(xs, ys);
        }
      }
    }
    profile.correlations = correlations;
  }

  if (options?.targetColumn) {
    const targetIdx = headers.indexOf(options.targetColumn);
    if (targetIdx !== -1) {
      const targetValues = rows.map((r) => r[targetIdx]);
      profile.targetAnalysis = analyzeTarget(targetValues);
    }
  }

  return profile;
}
