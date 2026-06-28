import type { SearchResult, EnrichedSearchResult, SearchContext } from "../types/search.js";

function isEnriched(result: SearchResult): result is EnrichedSearchResult {
  return "resultType" in result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function containsTechnique(text: string, technique: string): boolean {
  return text.toLowerCase().includes(technique.toLowerCase());
}

const ML_FRAMEWORKS = [
  "pytorch",
  "tensorflow",
  "jax",
  "keras",
  "scikit-learn",
  "sklearn",
  "huggingface",
  "transformers",
  "lightning",
  "fastai",
  "mxnet",
  "paddlepaddle",
  "onnx",
];

function scoreRecency(result: SearchResult): number {
  if (!result.publishedAt) return 0;
  const published = new Date(result.publishedAt);
  const now = new Date();
  const monthsAgo = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24 * 30);

  if (monthsAgo <= 12) return 0.2;
  if (monthsAgo <= 24) return 0.1;
  return 0;
}

function scorePopularity(result: SearchResult): number {
  if (!isEnriched(result)) return 0;

  let score = 0;
  if (result.citations != null && result.citations > 0) {
    score = Math.max(score, Math.log10(result.citations + 1) / 4);
  }
  if (result.stars != null && result.stars > 0) {
    score = Math.max(score, Math.log10(result.stars + 1) / 4);
  }
  return Math.min(score, 0.25);
}

function scoreCodeAvailability(result: SearchResult): number {
  if (!isEnriched(result)) return 0;
  return result.codeUrl ? 0.15 : 0;
}

function scoreDeadEndPenalty(result: SearchResult, context: SearchContext): number {
  if (!context.deadEnds || context.deadEnds.length === 0) return 0;

  const text = `${result.title} ${result.snippet}`;
  for (const deadEnd of context.deadEnds) {
    if (containsTechnique(text, deadEnd)) {
      return -0.5;
    }
  }
  return 0;
}

function scoreWorkingTechniqueBoost(result: SearchResult, context: SearchContext): number {
  if (!context.workingTechniques || context.workingTechniques.length === 0) return 0;

  const text = `${result.title} ${result.snippet}`;
  for (const technique of context.workingTechniques) {
    if (containsTechnique(text, technique)) {
      return 0.2;
    }
  }
  return 0;
}

function scoreDatasetMatch(result: SearchResult, context: SearchContext): number {
  if (!context.dataset) return 0;

  const text = `${result.title} ${result.snippet}`;
  if (containsTechnique(text, context.dataset)) {
    return 0.1;
  }
  return 0;
}

function scoreFrameworkMatch(result: SearchResult): number {
  if (!isEnriched(result)) return 0;
  if (!result.frameworks || result.frameworks.length === 0) return 0;

  for (const framework of result.frameworks) {
    if (ML_FRAMEWORKS.some((f) => framework.toLowerCase().includes(f))) {
      return 0.1;
    }
  }
  return 0;
}

export function scoreResult(result: SearchResult, context?: SearchContext): number {
  let total = 0;

  total += scoreRecency(result);
  total += scorePopularity(result);
  total += scoreCodeAvailability(result);

  if (context) {
    total += scoreDeadEndPenalty(result, context);
    total += scoreWorkingTechniqueBoost(result, context);
    total += scoreDatasetMatch(result, context);
  }

  total += scoreFrameworkMatch(result);

  return clamp(total, 0, 1);
}

export function scoreResults(results: SearchResult[], context?: SearchContext): SearchResult[] {
  for (const result of results) {
    result.score = scoreResult(result, context);
  }
  return results.sort((a, b) => b.score - a.score);
}
