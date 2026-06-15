# ML Decision Frameworks

Thinking models from cc-thinking-skills adapted specifically for ML research decisions. These go beyond the quick triggers in `02-thinking-triggers.md` — use when facing a non-trivial decision that deserves structured reasoning.

## Pre-Mortem: Before Committing to Experiment Plan

Before approving an expensive experiment plan, assume it has already failed:

> "It's 2 weeks later. We spent $500 and the metric didn't improve. What happened?"

Generate concrete failure reasons specific to THIS plan:

| Failure Reason | Probability | Mitigation |
|----------------|-------------|------------|
| Technique doesn't work at our model scale | 30% | Screen at 1/10 scale first |
| Hyperparameter range was wrong | 20% | Use wider sweep, log scale for LR |
| Data issue masks the improvement | 15% | Validate data pipeline independently |
| Interacts badly with existing technique X | 10% | Test in isolation before combining |
| We measured the wrong metric | 5% | Verify metric extraction matches evaluation |

**Decision rule**: if the top failure reason has probability > 40%, add a screening experiment before the full run.

## Theory of Constraints: Find the Training Bottleneck

Before optimizing anything, find what actually limits your training:

```
Training pipeline:
  Data loading → Preprocessing → Forward pass → Loss compute → Backward pass → Optimizer step → Logging
  
Profile each stage:
  | Stage         | Time (ms) | % of step |
  |---------------|-----------|-----------|
  | Data loading  | 120       | 40% ←BOTTLENECK |
  | Forward pass  | 80        | 27%       |
  | Backward pass | 70        | 23%       |
  | Other         | 30        | 10%       |
```

**Rules**:
- Optimizing forward pass when data loading is the bottleneck = wasted effort
- Fix the bottleneck first, then reprofile — the bottleneck will shift
- Common ML bottlenecks by constraint type:
  - **Training speed**: data loading (fix with prefetch/workers), communication (fix with gradient compression)
  - **Model quality**: data quality > architecture > training recipe > hyperparameters
  - **Model size**: weight precision (quantization) > architecture (width/depth) > vocabulary size
  - **Inference latency**: model depth > attention mechanism > batch strategy

## Second-Order Effects: "And Then What?"

Before applying a technique, trace the chain:

| Decision | First Order | Second Order | Third Order |
|----------|------------|-------------|-------------|
| Add more augmentation | Regularizes, reduces overfitting | Training takes 2x longer | Less time for other experiments |
| Use bigger model | Better capacity, lower loss | Doesn't fit in size budget | Need quantization → quality loss |
| Train longer | Lower final loss | Diminishing returns after epoch N | Delays iteration on better ideas |
| Add ensemble | +0.005 accuracy | 3x inference cost | May exceed latency constraint |
| Prune then quantize | Smaller model | Two sources of quality loss | May need distillation to recover → complexity |

**The check**: ask "and then what?" twice. If the second-order effect changes your decision, it's real. If the third-order effect is speculative, stop there.

## Leverage Points in ML: Where to Focus

Meadows' hierarchy adapted for ML optimization. Higher = more impact per effort:

| Level | ML Intervention | Impact | Example |
|-------|----------------|--------|---------|
| **1. Goal** (highest) | Change what you're optimizing | Reframes everything | Switch from accuracy to F1; add auxiliary loss |
| **2. Paradigm** | Change the approach entirely | Game-changing | Switch from supervised to self-supervised; different architecture family |
| **3. Rules** | Change training rules | Structural | Different loss function; different CV strategy; curriculum learning |
| **4. Structure** | Change architecture | Significant | Add attention; change normalization; skip connections |
| **5. Feedback** | Change information flow | Moderate | Label smoothing; mixup; knowledge distillation |
| **6. Data flow** | Change what the model sees | Moderate | Better preprocessing; data augmentation; feature engineering |
| **7. Parameters** (lowest) | Tune hyperparameters | Incremental | LR, batch size, weight decay, dropout rate |

**Anti-pattern**: spending 80% of time at level 7 (hyperparameter tuning) when level 4-5 changes would yield 10x the gain.

**Decision rule**: before tuning hyperparameters, ask "is there a structural change that would make this tuning unnecessary?"

## Opportunity Cost: What You're NOT Trying

Every day spent on technique A is a day NOT spent on technique B.

Before committing to an experiment:

1. **Name the next-best alternative** — what's the most promising technique you'd try instead?
2. **Compare expected value** — which has higher EV?
3. **Consider the "do nothing" option** — sometimes the current result is good enough and time is better spent on submission/ensembling

| Common Trap | Real Cost |
|-------------|-----------|
| 3 days tuning hyperparameters | Could have tried 2 different architectures |
| Building custom data pipeline | Could have used existing augmentation library |
| Implementing paper from scratch | Could have adapted existing GitHub implementation |
| Optimizing training speed | Could have run more experiments at current speed |

**Rule**: if expected time > 1 day, explicitly name what you're NOT doing. If the alternative has higher EV, switch.

## Probabilistic Estimates: Ranges, Not Points

Never say "this will improve loss by 0.01." Say "70% confidence this improves loss by 0.005-0.015."

### For Experiment Predictions

```
Experiment: Add QAT (4-bit)
Base rate: similar papers report 0.005-0.020 BPB degradation at int4
Our estimate: 0.008-0.015 BPB degradation (narrower: we have similar architecture)
Confidence: 75%
Upside scenario (15%): degradation < 0.005 (model is quantization-friendly)
Downside scenario (10%): degradation > 0.020 (sensitive layers, need mixed precision)
```

### For Timeline Estimates

```
Implementing technique X:
Optimistic: 4 hours (everything works first try)
Expected: 8 hours (one debugging cycle)
Pessimistic: 20 hours (fundamental incompatibility discovered)
Use the 80th percentile (12-15 hours) for planning, not the expected value.
```

### Update Rule

When you get new evidence (screening result, partial training), update:
- Result better than expected → narrow the range, increase confidence
- Result worse → widen the range, check failure reasons
- Result exactly as predicted → no update needed (this is rare — be honest)
