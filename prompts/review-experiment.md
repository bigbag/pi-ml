# Review Experiment Results

Review these experiment results and provide:

1. **Key Findings**: What worked, what didn't. Use `experiment_diff` to compare top experiments.
2. **Metric Analysis**: Use `analyze_output` to extract trends. Are deltas statistically significant? Use `statistical_test` to verify.
3. **Diagnosis**: If results are unexpected, use `diagnose` to classify the failure and walk the diagnostic tree. Check `skills/ml-debugging` for the full debugging workflow.
4. **Ablation Check**: Do we know which components actually contributed? (see `skills/experiment-planning/references/04-ablation-methodology.md`)
5. **Hypothesis Update**: For each experiment, update the linked hypothesis:
   ```
   hypothesis_update id="<hyp-id>" status="confirmed|rejected" outcome="<what happened>"
   ```
6. **Investigation Context**: How does this result move us toward the investigation goal? Update current best if improved:
   ```
   journal_query type="experiments" filter={"investigationId": "<id>"}
   ```
7. **Next Steps**: Top 3 highest-value experiments. Rank by expected value, not novelty.
8. **Record Findings**: Save key insights for future reference:
   ```
   finding_record type="insight" text="<finding>" tags=["<topic>"] sourceExperiments=["<exp-id>"]
   ```

Think in bits, not vibes. Be specific about what the numbers mean.
"Loss is still decreasing" is useless. "val_bpb dropped 0.003 in the last 20% suggesting 0.001-0.002 more from longer training" is actionable.
