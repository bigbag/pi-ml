# Multi-Constraint Pareto Analysis

Most ML tasks optimize one metric. Real problems have competing constraints: accuracy vs model size vs latency vs training cost. You need Pareto analysis, not single-metric ranking.

## Constraint Hierarchy

Classify every constraint before researching techniques:

| Level | Type | Example | Treatment |
|-------|------|---------|-----------|
| **Hard** | Violation = disqualified | Max 16MB artifact size | Filter: any technique that breaks this is rejected |
| **Soft** | Violation = penalty | Training > 10min adds $1/min | Score: penalize techniques proportionally |
| **Objective** | Optimize | Minimize val_bpb | Rank: order surviving techniques by this |

**Rule**: satisfy hard constraints first, then optimize the objective within the soft constraint budget.

## Pareto Frontier Construction

When you have 2+ competing objectives (e.g., accuracy vs model size):

1. Run experiments sampling different tradeoff points
2. Plot each experiment as a point in (objective1, objective2) space
3. Mark the Pareto frontier: points where no other point is better on ALL objectives
4. Choose from the frontier based on your constraint priorities

```
    Accuracy
    ↑
    |   * B (0.95, 50MB)        ← Pareto-optimal
    |       * C (0.93, 30MB)    ← Pareto-optimal  
    |   * A (0.92, 45MB)        ← Dominated by C (worse on both)
    |           * D (0.90, 15MB) ← Pareto-optimal
    +——————————————————→ Model Size (smaller = better)
```

B, C, D are Pareto-optimal. A is dominated. Choose C if 30MB meets your hard constraint.

## Common Tradeoff Axes in ML

| Axis 1 | Axis 2 | Typical Tradeoff Lever |
|--------|--------|----------------------|
| Accuracy | Model size | Quantization bit-width, pruning ratio |
| Accuracy | Latency | Model depth/width, distillation |
| Accuracy | Training cost | Number of epochs, data fraction |
| Accuracy | Interpretability | Model family (tree vs neural net) |
| Training speed | Final accuracy | LR schedule, early stopping patience |

## Constraint-Aware Technique Filtering

Before ranking techniques, filter through constraints:

```
For each candidate technique:
  1. Estimate effect on EACH constraint dimension
  2. Check hard constraints: would this violate any? → REJECT
  3. Check soft constraints: what's the penalty? → PENALIZE
  4. Compute net value: expected_gain - soft_penalties
  5. Only if net value > 0: include in ranking
```

## Marginal Analysis at the Constraint Boundary

When you're near a hard constraint boundary (e.g., 15.5MB of 16MB limit):

- **Remaining budget** = hard_limit - current_value = 0.5MB
- **Marginal value** of 0.5MB: what accuracy gain can 0.5MB buy?
- Compare: technique A uses 0.3MB for +0.005 accuracy vs technique B uses 0.5MB for +0.008
- B gives more accuracy but exhausts the budget — can't combine with anything else
- A leaves 0.2MB for a third technique

**Rule**: at constraint boundaries, optimize per-unit-of-constraint, not absolute gain.

## Reporting Tradeoffs

When presenting results, always show the full tradeoff:

```
| Technique | Accuracy | Size | Latency | Training Cost | Verdict |
|-----------|----------|------|---------|---------------|---------|
| Baseline  | 0.90     | 12MB | 50ms   | $10           | —       |
| + QAT     | 0.89     | 6MB  | 25ms   | $15           | ✅ size + latency win, tiny accuracy loss |
| + Pruning | 0.88     | 8MB  | 30ms   | $12           | ⚠️ less gain than QAT on size |
| + Both    | 0.86     | 4MB  | 15ms   | $20           | ❌ accuracy drop too large |
```

Never report just the accuracy column — the agent and user need the full picture to make constraint-aware decisions.
