# Experiment Planning

Use this skill when the user wants to design an experiment sequence for an ML task or competition.

## When to Use

- Starting a new Kaggle competition or ML challenge
- Designing a training pipeline from scratch
- Planning ablation studies
- Deciding what to try next after reviewing results

## Experiment Ordering Rules

1. **Quick wins first** — low-effort changes with clear expected improvement go early. Builds momentum and establishes a stronger baseline.
2. **Foundation before refinement** — architectural changes before hyperparameter tuning. No point tuning LR for a model you're about to restructure.
3. **Independent experiments in parallel** — flag when two changes affect different parts of the model and can run simultaneously.
4. **Ablation-friendly** — each experiment changes one thing (or a coherent group) so contribution is measurable.

## For Each Experiment

Include these fields in your plan:

- **Hypothesis**: What you expect and why
- **Changes**: Specific code/config changes
- **Baseline**: What to compare against
- **Success metric**: How to know if it worked
- **Expected gain**: Quantitative estimate
- **Risk**: What could go wrong
- **Time estimate**: GPU-hours or wall-clock
- **Depends on**: Previous experiments, if any

## Example Sequence

```
Exp 1: Baseline reproduction (verify starting point)
Exp 2: Data augmentation sweep (quick win, low risk)
Exp 3: Architecture change: wider vs deeper
Exp 4: Quantization scheme comparison
Exp 5: Final ensemble with best configs
```
