# Phase Templates

Templates for experiment tracking artifacts. Use with `experiment_track` and `artifact_tag`.

---

## Task Analysis (Phase 0)

Store as experiment metadata via `experiment_track action=create`:

```json
{
  "session": "YYYY-MM-DD-short-tag",
  "task": "one-sentence optimization task description",
  "metric": {
    "name": "val_bpb",
    "direction": "minimize",
    "extract_pattern": "grep val_bpb train.log | tail -1"
  },
  "baseline": { "value": 0.0, "source": "experiment exp_000" },
  "target": 0.0,
  "constraints": {
    "time_per_run": "600s",
    "artifact_size": "16000000 bytes",
    "compute_budget": "$50"
  },
  "training_command": "torchrun --standalone --nproc_per_node=8 train.py",
  "abort_consecutive_failures": 3,
  "dead_ends": [
    { "technique": "name", "result": "what happened", "source": "exp_id" }
  ],
  "working_techniques": [
    { "technique": "name", "result": "improvement", "source": "exp_id" }
  ]
}
```

---

## Research Findings (Phase 1)

```markdown
# Research Findings — <session>

**Date:** YYYY-MM-DD
**Baseline:** <metric> = <value>
**Target:** <metric> <direction> <value>

## Top Candidates

### 1. <Technique Name>
- **Source:** <paper URL / repo link>
- **Expected impact:** <estimated metric improvement>
- **Implementation:** trivial / moderate / significant
- **Risk:** proven elsewhere / theoretical / speculative
- **Dead-end check:** not tried / tried differently
- **Summary:** 2-3 sentences

## Rejected Ideas

- <technique>: already tried, result was <X>
- <technique>: violates constraint <X>

## Key Papers

- <title> (<year>) — <URL> — <one-line relevance>
```

---

## Experiment Plan (Phase 2)

```markdown
# Experiment Plan — <session>

**Baseline:** <metric> = <value>
**Target:** <metric> <direction> <value>
**Budget:** $<remaining>
**Abort after:** <N> consecutive failures

## Experiments

### exp_001: <name>
- **Hypothesis:** what we expect and why
- **Config:** `KEY1=value1 KEY2=value2`
- **Code changes:** none / description
- **Expected:** <metric> <baseline> → <estimated> (Δ = <delta>)
- **Cost:** ~$<amount>
- **Screening:** yes/no
- **Depends on:** none / exp_NNN
```

---

## Per-Experiment Results (Phase 3)

Store via `experiment_track action=update`:

```json
{
  "status": "success | failed | crashed | aborted",
  "metric": { "value": 0.0, "baseline": 0.0, "delta": 0.0, "improved": true },
  "timing": { "training_seconds": 0, "total_seconds": 0 },
  "cost": { "estimated": 0.0, "actual": 0.0 },
  "code_modified": false,
  "screening_tier": "screening | full | promoted"
}
```

### Status values

| Status | Meaning | Counts toward abort? |
|--------|---------|---------------------|
| `success` | Completed, metric improved | No (resets counter) |
| `failed` | Completed, metric NOT improved | **Yes** |
| `crashed` | Infrastructure failure | No |
| `aborted` | User stopped | No |

---

## Session Summary (Phase 4)

```markdown
# Session Summary — <session>

**Experiments run:** <N>
**Budget spent:** $<amount>

## Results

| # | Experiment | Metric | Δ | Cost | Status |
|---|-----------|--------|---|------|--------|

**Best:** <experiment_id> at <metric> = <value>

## Key Findings

- what worked and why
- what failed and why

## New Dead Ends

- <technique>: <result>

## New Working Techniques

- <technique>: <result>

## Recommendation

- Target reached / Loop with focus on X / Stop
```
