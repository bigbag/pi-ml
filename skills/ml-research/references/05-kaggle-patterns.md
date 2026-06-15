# Kaggle Competition Patterns

Distilled from real competition experience (agentic-kaggle-skill, kaggle-skills repos).

## Score Stabilization

| Time After Submit | Score Behavior | Action |
|-------------------|---------------|--------|
| Immediately | Baseline appears | Submit early to start evaluation |
| +2 hours | Peak (often inflated) | **Don't trust** — wait |
| +4 hours | Stabilized | **True score** — make decisions now |

Never celebrate early highs. Never panic over early lows.

## Competition Type → Strategy

| Type | Key Pattern |
|------|------------|
| Tabular | EDA → feature engineering → gradient boosting → stacking |
| Vision | Pretrained backbone → augmentation sweep → TTA → ensemble |
| NLP | Pretrained LM → fine-tune → prompt engineering → ensemble |
| Time Series | Chronological split (never shuffle) → lag features → rolling stats |
| RL/Agent | Self-play → reward shaping → population diversity |
| Notebook-only | Kernel resource limits → optimize memory → staged execution |

## Submission Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 400 Bad Request | Wrong file format / missing columns | Check sample_submission.csv schema exactly |
| Score = 0 | All-zero predictions / wrong column order | Inspect first 5 rows of submission |
| Score worse than random | Inverted predictions / wrong target encoding | Check label mapping matches evaluation |
| Timeout | Model too slow at inference | Optimize batch size, use ONNX, reduce ensemble |
| OOM on Kaggle | Notebook exceeds 16GB RAM | Reduce batch, del intermediates, gc.collect() |

## Top Notebook Replication Workflow

```bash
# 1. Pull WITH metadata (critical — preserves dependencies)
kaggle kernels pull <owner>/<kernel> -p ./replicated/ -m

# 2. Edit kernel-metadata.json: change id/title, KEEP all dependencies
# 3. Push to Kaggle
kaggle kernels push -p ./replicated/

# 4. Monitor status
kaggle kernels status <username>/<kernel-name>
```

## Cross-Validation Strategy by Data Type

| Data Type | Strategy | Why |
|-----------|----------|-----|
| i.i.d. tabular | StratifiedKFold (5-fold) | Preserves class distribution |
| Grouped data (patients, users) | GroupKFold | Prevents same entity in train+val |
| Time series | TimeSeriesSplit | Prevents future data leakage |
| Small dataset (<1000) | RepeatedStratifiedKFold | Reduces variance |
| Imbalanced (<5% minority) | StratifiedKFold + oversampling in train fold only | Never oversample before split |

## Ensemble Patterns

| Method | When | Code |
|--------|------|------|
| Simple average | Diverse models, similar scores | `(pred1 + pred2 + pred3) / 3` |
| Weighted average | Models with different accuracy | Optimize weights on OOF predictions |
| Rank average | Different scales (regression) | `rankdata(pred1) + rankdata(pred2)` |
| Stacking | Enough data, want max squeeze | Train meta-learner on OOF predictions |

**Safety rule**: Never ensemble on LB score alone — validate on local CV first.

## Common Kaggle Pitfalls

| Pitfall | Fix |
|---------|-----|
| Overfitting to public LB | Trust CV, submit sparingly, track shake-up risk |
| Ignoring data leakage | Run leakage hunt (see ml-debugging reference) |
| Complex model before strong baseline | Start with logistic regression / LightGBM baseline |
| Not reading the discussion forum | Top solutions often share key insights early |
| Submitting without local validation | Always validate locally before burning a submission |
