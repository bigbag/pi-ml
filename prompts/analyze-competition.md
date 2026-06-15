# Analyze ML Competition

Analyze this machine learning competition/challenge and provide:

1. **Problem Overview**: What are we predicting/optimizing? What's the evaluation metric?
2. **Constraints**: Model size, compute budget, time limits, evaluation rules. Classify each as hard/soft/objective (see `skills/ml-research/references/07-constraint-pareto.md`).
3. **Data Analysis**: Use `dataset_profile` on the training data. Key characteristics, preprocessing needs, target distribution.
4. **Leaderboard Archaeology**: Use `search_benchmarks` to find SOTA. What techniques got top entries there?
5. **Technique Research**: Use `ml_search` and `search_implementations` for relevant techniques. Check `skills/ml-research/references/06-technique-interactions.md` for synergies/conflicts.
6. **Experiment Plan**: Ordered sequence with expected gains. Quick wins first, foundation before refinement.
7. **Pre-Mortem**: Assume the plan failed — what are the top 3 failure reasons? (see `skills/ml-research/references/08-ml-decision-frameworks.md`)
8. **Risk Assessment**: What could make this fail? What's the opportunity cost of this approach?

Be specific and quantitative. Every expected gain must have a basis (paper result, leaderboard entry, or reasoned estimate with confidence range).
