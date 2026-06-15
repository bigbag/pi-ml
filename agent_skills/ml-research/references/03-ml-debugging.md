# ML Debugging Decision Tree

## First Move: Can It Overfit One Batch?

The fastest sanity check in ML. Take a single small batch and train until loss ≈ 0.

```python
x, y = next(iter(train_loader))
for _ in range(200):
    optimizer.zero_grad()
    loss = criterion(model(x), y)
    loss.backward(); optimizer.step()
print(loss.item())  # should approach 0
```

- **Can't overfit one batch** → bug in model/loss/labels/data wiring (not capacity)
- **Overfits one batch but not dataset** → optimization or regularization issue

## Symptom → Cause → Fix

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Loss = NaN | LR too high; log(0); /0; bad input scaling | Lower LR, clip grads, add eps, normalize inputs |
| Loss flat at start | LR too low; dead ReLUs; wrong loss | Raise LR; check init; verify loss/target shapes |
| Train great, val terrible | Overfitting **or** leakage | Regularize/augment; audit for leakage |
| Val better than train | Leakage; val too easy; dropout artifact | Re-check split; inspect val set |
| Metric implausibly high | Target leakage | Hunt leaked features (see leakage hunt below) |
| Stuck at chance | Labels misaligned; data not shuffled; LR off | Verify label mapping; shuffle; sweep LR |
| Loss spikes mid-training | LR schedule jump; data batch issue; gradient explosion | Check schedule; inspect failing batch; clip grads |
| OOM during training | Batch too large; model too wide; accumulation leak | Reduce batch; gradient checkpointing; mixed precision |

## Leakage Hunt (When Results Are "Too Good")

1. Any feature with |corr| ≈ 1.0 to target?
2. Is preprocessing fit before the split?
3. Do rows from one entity span train and test? (use GroupKFold)
4. Time series shuffled? (must be chronological)
5. Is a post-outcome column (e.g., `refund_issued`) used to predict the outcome?

## Optimization Checklist

- Normalize/standardize inputs
- Sweep LR over `[1e-5 ... 1e-1]` (log scale) — wrong LR causes most failures
- Add gradient clipping for RNNs/transformers
- Check for NaNs in inputs/targets before training
- Verify loss matches task (CE for classification logits, not MSE)

## Common Pitfalls

| Wrong | Correct |
|-------|---------|
| Change five things at once | One variable per experiment |
| Debug on full dataset | Shrink to fail fast |
| Trust metrics without inspecting predictions | Always check confusion matrix / sample predictions |
| Assume NaN = data bug | Could be LR, grad explosion, or log(0) |
