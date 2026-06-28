/**
 * Statistical utilities for ML experiment evaluation.
 * Pure TypeScript, no dependencies.
 */

/** Error function (Abramowitz & Stegun approximation). */
function erf(x: number): number {
  const s = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

/** Standard normal CDF. */
function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Log gamma function (Lanczos approximation). */
function lgamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Exact log binomial coefficient: ln(C(n,k)). */
function lnBinom(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
}

/**
 * Exact two-sided binomial p-value vs p=0.5.
 * Sums probabilities of all outcomes at least as extreme as observed.
 */
export function binomialExactTwoSided(k: number, n: number): number {
  const logPmf = (i: number) => lnBinom(n, i) - n * Math.LN2;
  const target = logPmf(k);
  let p = 0;
  for (let i = 0; i <= n; i++) {
    if (logPmf(i) <= target + 1e-12) {
      p += Math.exp(logPmf(i));
    }
  }
  return Math.min(1, p);
}

/**
 * Mid-p McNemar test for paired binary outcomes.
 * b = treatment-only successes, c = control-only successes.
 */
export function mcnemarMidP(b: number, c: number): number {
  const n = b + c;
  if (n === 0) return 1;
  const k = Math.max(b, c);
  const logPmf = (i: number) => lnBinom(n, i) - n * Math.LN2;
  const logPobs = logPmf(k);

  let exact = 0;
  for (let i = 0; i <= n; i++) {
    const lp = logPmf(i);
    if (lp <= logPobs + 1e-12) exact += Math.exp(lp);
  }

  // mid-p = exact - 0.5 * P(observed outcome(s))
  const pObs = Math.exp(logPobs);
  const pOther = k !== n - k ? Math.exp(logPmf(n - k)) : 0;
  const midp = exact - 0.5 * (pObs + pOther);
  return Math.min(1, midp);
}

/**
 * Wilson score confidence interval for a binomial proportion.
 * Default z=1.96 for 95% CI.
 */
export function wilsonInterval(
  k: number,
  n: number,
  z: number = 1.96
): { lower: number; upper: number } {
  if (n === 0) return { lower: 0, upper: 1 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return {
    lower: (center - h) / d,
    upper: (center + h) / d,
  };
}

/**
 * Convenience: is the binomial result significant at the given alpha level?
 * Default alpha = 0.05.
 */
export function isSignificant(k: number, n: number, alpha: number = 0.05): boolean {
  return binomialExactTwoSided(k, n) < alpha;
}

/**
 * Sample size needed to detect an effect (simple normal approximation).
 * effectSize: expected proportion difference from 0.5 (e.g., 0.1 means you expect 60% win rate)
 * power: desired power (default 0.8)
 * alpha: significance level (default 0.05, two-sided)
 */
export function requiredN(effectSize: number, power: number = 0.8, alpha: number = 0.05): number {
  if (effectSize <= 0) return Infinity;
  // z-values for two-sided alpha and desired power
  const zAlpha = -normCdfInverse(alpha / 2);
  const zBeta = -normCdfInverse(1 - power);
  // For a proportion test around p=0.5: n = ((z_alpha + z_beta) / effectSize)^2 * p*(1-p)
  // With p=0.5, p*(1-p) = 0.25
  const n = Math.pow((zAlpha + zBeta) / effectSize, 2) * 0.25;
  return Math.ceil(n);
}

/** Inverse normal CDF (rational approximation, Beasley-Springer-Moro). */
function normCdfInverse(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Use symmetry
  if (p > 0.5) return -normCdfInverse(1 - p);

  // Rational approximation for lower tail
  const t = Math.sqrt(-2 * Math.log(p));
  const c0 = 2.515517;
  const c1 = 0.802853;
  const c2 = 0.010328;
  const d1 = 1.432788;
  const d2 = 0.189269;
  const d3 = 0.001308;

  return -(t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t));
}
