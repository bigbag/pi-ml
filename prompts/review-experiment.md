# Review Experiment Results

Review these experiment results and provide:

1. **Key Findings**: What worked, what didn't. Use `experiment_diff` to compare top experiments.
2. **Metric Analysis**: Use `log_analyze` to extract trends. Are deltas statistically significant? (see `skills/ml-research/references/02-thinking-triggers.md`: margin of safety)
3. **Diagnosis**: Underfitting? Overfitting? Instability? Bottleneck? Check `skills/ml-research/references/03-ml-debugging.md` for the symptom→cause decision tree.
4. **Ablation Check**: Do we know which components actually contributed? (see `skills/experiment-planning/references/04-ablation-methodology.md`)
5. **Next Steps**: Top 3 highest-value experiments. Rank by expected value, not novelty.
6. **Updated Plan**: Revise expected gains and ordering based on new evidence. Update dead ends and working techniques.

Think in bits, not vibes. Be specific about what the numbers mean.
"Loss is still decreasing" is useless. "val_bpb dropped 0.003 in the last 20% suggesting 0.001-0.002 more from longer training" is actionable.
