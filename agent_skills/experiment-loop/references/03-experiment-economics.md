# Experiment Economics

**Primary goal: best score / winning solution.** Budget optimization is secondary — it only kicks in when the user explicitly sets a compute or time budget. Without a budget constraint, run everything that has positive expected value.

## Expected Value Framework

For each candidate experiment:

```
EV = P(success) × expected_gain
```

**Rank by EV.** When budget is unconstrained, run highest-EV experiments first regardless of cost.

When the user sets a budget constraint, add cost-awareness:

```
EV_per_dollar = P(success) × expected_gain / cost
```

Only optimize for EV_per_dollar when budget is explicitly limited.

## Budget Allocation Strategy

**Only applies when user sets an explicit budget.** Without a budget, skip this section — just run everything promising.

### Phase Budget Split (when budget-constrained)

| Phase | % of Total Budget | Why |
|-------|-------------------|-----|
| Screening (cheap validation) | 15-20% | Kill bad ideas early, save budget for winners |
| Full-scale promising techniques | 50-60% | This is where gains come from |
| Ablation / confirmation runs | 15-20% | Verify the gain is real, not noise |
| Reserve for surprises | 10% | Something unexpected always comes up |

### When to Stop Exploring

Stop adding new techniques when:
- **Target reached**: metric meets or exceeds the goal
- **Diminishing returns**: last 3 experiments each gained < 20% of the first experiment's gain
- **Statistical floor**: expected gain is smaller than run-to-run variance (can't measure it)
- **Budget exhausted** (only if budget-constrained): remaining budget < cost of 2 full runs

### Cost-Per-Improvement Unit (budget-constrained only)

When budget is limited, track efficiency:

```
CPIU = total_spend / total_improvement
```

If CPIU is increasing exponentially, you're in diminishing returns — switch axis or reallocate budget. But if budget is unconstrained and improvements are still positive, keep going regardless of CPIU.

## Screening Strategy

**Principle**: validate cheaply before committing full budget.

| Screening Method | Cost vs Full Run | Reliability |
|-----------------|------------------|-------------|
| 1/10th data, same epochs | ~10% | Good for relative ranking, not absolute numbers |
| Full data, 1/5th epochs | ~20% | Better for techniques that need convergence |
| Single GPU (vs multi-GPU full) | ~25% | Good if technique scales linearly |
| Proxy metric (train loss instead of val metric) | ~5% | Only for filtering clearly bad ideas |

**Decision rule**: if screening shows delta < -50% of baseline noise → kill it. If delta > +30% of expected gain → promote to full run.

## Parallel vs Sequential

| Situation | Strategy | Why |
|-----------|----------|-----|
| Independent techniques, budget allows | Run in parallel | Wall-clock savings |
| Dependent techniques (B needs A's output) | Sequential, A first | Can't parallelize |
| Unsure if technique works | Screen first, then full | Don't waste parallel slots on bad ideas |
| Limited GPU slots | Highest-ROI first | Opportunity cost of each slot |

## Sunk Cost Discipline

- A technique that cost $20 to implement but shows no gain is NOT worth another $20 "to be sure"
- Judge next-experiment decisions on FORWARD ROI, not past investment
- Exception: if failure cause is identified and fixable (e.g., wrong LR), one retry is justified

## When to Invest in Infrastructure

Invest when:
- You'll run > 10 experiments with the same setup
- Setup time > 20% of total experiment time
- Reproducibility is critical (competition deadline approaching)

Don't invest when:
- Exploring a new direction (might pivot)
- Only 2-3 experiments planned
- Infrastructure cost > remaining experiment budget
