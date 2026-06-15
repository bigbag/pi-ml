# Ablation Methodology

Ablation studies isolate which components of a system contribute what. Without ablation, you don't know if your improvement came from technique A, technique B, or the interaction — so you can't make informed decisions about what to keep.

## When to Ablate

- After combining multiple techniques that together improve the metric
- Before claiming a technique "works" in a write-up or report
- When budget allows confirmation runs (see experiment economics: 15-20% of budget)
- Before dropping a component you suspect is dead weight

## Ablation Design Patterns

### Pattern 1: Leave-One-Out (most common)

Start from the full system, remove one component at a time:

```
Full system (A + B + C + D):     val_bpb = 1.150
Remove A (B + C + D):            val_bpb = 1.165  → A contributes 0.015
Remove B (A + C + D):            val_bpb = 1.155  → B contributes 0.005
Remove C (A + B + D):            val_bpb = 1.152  → C contributes 0.002
Remove D (A + B + C):            val_bpb = 1.170  → D contributes 0.020
```

**Cost**: N experiments for N components. Reveals contribution of each component in context of others.

**Limitation**: doesn't reveal interaction effects (A might only work because B is present).

### Pattern 2: Additive (build up)

Start from baseline, add one component at a time:

```
Baseline:                        val_bpb = 1.200
+ A:                             val_bpb = 1.185  → A adds 0.015
+ A + B:                         val_bpb = 1.175  → B adds 0.010 (on top of A)
+ A + B + C:                     val_bpb = 1.168  → C adds 0.007
+ A + B + C + D:                 val_bpb = 1.150  → D adds 0.018
```

**Cost**: N experiments. Reveals marginal gain of each addition in sequence.

**Limitation**: order-dependent. B's contribution depends on whether A is already present. Run multiple orderings if budget allows.

### Pattern 3: Factorial (gold standard, expensive)

Test all 2^N combinations:

```
        A  B  C  | val_bpb
        0  0  0  | 1.200  (baseline)
        1  0  0  | 1.185
        0  1  0  | 1.190
        0  0  1  | 1.195
        1  1  0  | 1.172
        1  0  1  | 1.178
        0  1  1  | 1.182
        1  1  1  | 1.165  (full system)
```

**Cost**: 2^N experiments. Reveals ALL interactions. Only feasible for N ≤ 4-5.

**When to use**: when technique interaction mapping (see reference) flags potential SYNERGY or CONFLICT pairs.

## Interpreting Results

### Contribution is Consistent
If leave-one-out and additive agree on contribution magnitude → component effect is robust, not dependent on other components.

### Contribution Differs by Context
If A contributes 0.015 in leave-one-out but only 0.005 in additive → A has a strong interaction with some other component. Investigate which one.

### Component Shows No Contribution
If removing a component doesn't change the metric (within noise):
- It may be genuinely useless → remove it (simpler system, less risk)
- It may be a safety net that only activates on edge cases → test on diverse eval sets before removing
- The metric might not capture its contribution → check other metrics

## Statistical Rigor

### Run-to-Run Variance
Before claiming a component contributes Δ:
- Measure run-to-run variance (3+ runs with different seeds, same config)
- Only trust Δ > 2× standard deviation of run-to-run variance

### How Many Seeds?
```
If variance per run σ ≈ 0.002 and you want to detect Δ = 0.005:
  Required runs per config ≈ (2σ/Δ)² ≈ (0.004/0.005)² ≈ 1
  → 1 run is marginal; 3 runs gives confidence
  
If σ ≈ 0.005 and Δ = 0.005:
  Required runs ≈ (0.01/0.005)² = 4
  → Need 4+ runs per config to distinguish signal from noise
```

### Report Format

```
| Component | Full System | Without | Δ | Significance |
|-----------|-------------|---------|---|-------------|
| A (QAT)   | 1.150 ± 0.002 | 1.165 ± 0.003 | -0.015 | p < 0.01 ✅ |
| B (Aug)   | 1.150 ± 0.002 | 1.155 ± 0.002 | -0.005 | p < 0.05 ✅ |
| C (Sched) | 1.150 ± 0.002 | 1.152 ± 0.003 | -0.002 | p = 0.15 ❌ |
```

C's contribution is within noise — it's a candidate for removal.

## Budget-Conscious Ablation

When you can't afford full ablation:

1. **Ablate only the top 3 contributors** (skip components you're confident about)
2. **Use screening runs** (1/10th data) for initial ablation, full runs only for surprising results
3. **Pair ablation with leave-one-out**: only 2-3 experiments to test the most uncertain components
4. **Skip ablation for well-established techniques** (e.g., basic data augmentation) — ablate novel/risky ones
