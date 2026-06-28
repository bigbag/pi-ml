# Diagnose Experiment Failure

Diagnose why this experiment failed or produced unexpected results.

## Evidence

**Experiment:** {{experimentId}}
**Investigation:** {{investigationId}}
**Hypothesis:** {{hypothesis}}

### Metrics
- Train: {{trainMetrics}}
- Validation: {{valMetrics}}
- Test: {{testMetrics}}

### Training Log
```
{{logExcerpt}}
```

### Dataset Profile
{{datasetProfile}}

## Past Failures (from journal)

{{#pastFindings}}
- **{{type}}**: {{text}} (from {{sourceExperiments}})
{{/pastFindings}}

## Diagnostic Process

### Step 1: Classify the Failure

Based on the evidence, classify into one of:
- **Overfitting**: train ≫ val metrics
- **Underfitting**: poor train metrics
- **Training instability**: NaN, exploding, or oscillating loss
- **Poor generalization**: val ok but test bad
- **Class imbalance**: high accuracy but bad recall/precision
- **Slow convergence**: loss decreasing very slowly
- **Unknown**: none of the above

### Step 2: Walk the Diagnostic Tree

For the classified failure type, check each node in order:

1. State the check
2. Evaluate against the evidence
3. If the check matches → report the likely cause and suggested fix
4. If not → move to the next check

### Step 3: Report

**Failure type:** <classification>
**Root cause:** <most likely cause based on evidence>
**Confidence:** low / medium / high
**Evidence:** <what pointed to this cause>
**Suggested fixes** (ranked by expected impact):
1. <fix 1>
2. <fix 2>
3. <fix 3>

### Step 4: Record

```
finding_record type="insight" text="<root cause and fix>" tags=["debugging", "<failure-type>"]
```

If this is a novel root cause:
```
learning_save text="<generalized lesson>" evidence=["{{experimentId}}"] tags=["debugging"]
```
