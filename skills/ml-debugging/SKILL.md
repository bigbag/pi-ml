---
name: ml-debugging
description: Systematic ML debugging — diagnose experiment failures using ML-specific diagnostic trees for common failure patterns, with systematic hypothesis-test-eliminate fallback for novel problems. Use when an experiment fails, produces unexpected results, or metrics don't match expectations.
---

# ML Debugging

## Trigger Card

**Observe** evidence (logs, metrics, data profile) → **Classify** failure type → **Walk diagnostic tree** (known pattern) or **Systematic debug** (unknown) → **Record** finding → **Fix** and re-run. Check memory for past failures before starting. Record novel root causes as learnings.

## When to Use

- Experiment failed (crash, NaN loss, OOM)
- Metrics worse than expected or previous run
- Training instability (loss spikes, oscillation)
- Suspicious results (too good — likely leakage)
- Model not learning (flat loss curve)

## When NOT to Use

- Infrastructure issues (wrong GPU, disk full, network timeout) — fix the infra first
- Code syntax errors — fix the code first
- Choosing what to try next (use `ml-research` instead)

## Core Workflow

### Step 1: Collect Evidence

Gather all available information before forming hypotheses.

```
analyze_output logText="<paste training log>"
```

Also check:
- Training and validation metrics over time
- Dataset profile: `dataset_profile path="<data>"`
- Previous experiments: `journal_query type="experiments" filter={"investigationId": "<id>"}`

### Step 2: Check Memory

Before diagnosing from scratch, check if you've seen this before:

```
journal_query type="findings" filter={"tags": ["<failure-symptom>"]}
knowledge_search tags=["debugging", "<failure-type>"]
```

If a past finding matches, try its solution first. Skip to Step 5.

### Step 3: Classify Failure

Use the `diagnose` tool to classify the failure type:

```
diagnose evidence={"trainMetrics": {...}, "valMetrics": {...}, "lossHistory": [...]}
```

The classifier checks these patterns in priority order:

| Symptom | Failure Type | Diagnostic Tree |
|---------|-------------|----------------|
| Train metric ≫ validation metric | Overfitting | Check complexity, regularization, features, leakage |
| Poor training metric | Underfitting | Check capacity, features, learning rate, data quality |
| NaN/exploding/oscillating loss | Training instability | Check LR, gradients, scaling, batch size, data |
| Validation ok, test bad | Poor generalization | Check val strategy, distribution shift, val overfitting |
| High accuracy, bad recall/precision | Class imbalance | Check distribution, metric choice, sampling, weights |
| Very slow loss decrease | Slow convergence | Check LR, optimizer, scaling, batch size |
| None of the above | Unknown | → Systematic debugging fallback |

### Step 4a: Walk Diagnostic Tree (Known Pattern)

For each check in the tree, evaluate against the evidence:

1. Read the check question
2. Look at the evidence — does it match the indicators?
3. If yes → apply the suggested fix
4. If no → move to next check
5. If multiple checks match → prioritize by likelihood

### Step 4b: Systematic Debugging (Unknown Pattern)

When no diagnostic tree matches:

1. **Observe**: list all anomalies in the evidence
2. **Enumerate hypotheses**: list 3-5 possible causes, ranked by likelihood
3. **Test cheapest first**: design a minimal experiment to confirm or reject the top hypothesis
   - Change one thing
   - Run the shortest possible training (few epochs/iterations)
   - Compare to the failing run
4. **Eliminate or confirm**: update rankings based on result
5. **Repeat** until root cause is found

### Step 5: Record and Fix

After identifying the root cause:

```
finding_record type="insight" text="<root cause and fix>" tags=["debugging", "<failure-type>"] sourceExperiments=["<exp-id>"]
```

If this is a novel root cause not in the knowledge base:

```
learning_save text="<generalized lesson>" evidence=["<exp-id>"] tags=["debugging", "<category>"]
```

Apply the fix and re-run the experiment.

## Escalation Criteria

Stop debugging and surface to the human when:

- **3+ hypotheses tested** with no progress — you may be looking in the wrong place
- **Root cause is outside your control** — hardware issue, framework bug, data corruption
- **Fix requires domain expertise** — the right feature engineering needs domain knowledge
- **Multiple interacting causes** — the problem may need a redesign, not a fix

## Common Pitfalls

- **Don't guess-and-patch**: changing things randomly without understanding why wastes compute
- **Don't ignore partial evidence**: a run that crashed at epoch 5 still has 5 epochs of data
- **Don't assume the code is correct**: check data loading, preprocessing, metric computation
- **Don't confuse symptoms with causes**: "loss is NaN" is a symptom, not a cause
- **Don't skip the baseline check**: if the baseline also fails, the problem is in the data or pipeline, not the model
