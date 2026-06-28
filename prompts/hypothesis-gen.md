# Generate Hypotheses

Generate ranked hypotheses for the current investigation.

## Context

**Investigation goal:** {{goal}}
**Problem type:** {{problemType}}
**Current best:** {{currentBest.metric}} = {{currentBest.value}} ({{currentBest.experimentId}})
**Constraints:** {{constraints}}

## Past Experiments

Review these experiments and their outcomes:
{{#experiments}}
- **{{id}}**: {{config.model}} with {{config.features}} → {{outcome}} ({{metrics}})
  Hypothesis: {{hypothesisId}} — {{hypothesis.text}} → {{hypothesis.status}}
{{/experiments}}

## Knowledge Base

Relevant patterns for this problem type:
{{#patterns}}
- **{{technique}}** ({{category}}): {{whenToUse}}
  Gotchas: {{gotchas}}
{{/patterns}}

## Task

Generate 3-5 new hypotheses. For each:

1. **Hypothesis**: one clear sentence stating what you expect
2. **Rationale**: why this should work, based on evidence (past experiments, patterns, papers)
3. **Expected impact**: low / medium / high — with reasoning
4. **Expected value**: (probability of working × expected improvement) / cost
5. **Proposed experiment**: specific changes to test this hypothesis
6. **Risk**: what could go wrong, how to detect it early

## Ranking

Rank by expected value (EV), not novelty. A high-probability small win beats a low-probability moonshot.

Avoid:
- Hypotheses already tested (check past experiments)
- Hypotheses that change multiple variables at once
- Hypotheses without a clear success/failure criterion

## Output Format

Use `hypothesis_add` to record each hypothesis:
```
hypothesis_add investigationId="<id>" text="<hypothesis>" rationale="<why>" expectedImpact="<low|medium|high>"
```
