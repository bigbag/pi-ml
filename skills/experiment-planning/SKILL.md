---
description: Run autonomous ML experiment loops — assess task, research techniques, plan ranked experiments with cost estimates, execute with artifact tracking, analyze results, and iterate toward a target metric.
---

# ML Experiment Loop

## Trigger Card

**Assess** constraints and baseline → **Research** techniques with web/arxiv/github → **Plan** ranked experiments (human gate before spend) → **Execute** with full artifact tracking → **Analyze** results and loop or stop. One variable at a time. Never run training without approved plan.

## Quick Reference

| Trigger | Action |
|---------|--------|
| Starting experiment session | → Phase 0: Assess |
| Ready to research techniques | → Phase 1: Research (use `ml_search`, `search_implementations`, `search_benchmarks`) |
| Research done, ordering experiments | → Phase 2: Plan |
| Plan approved, time to run | → Phase 3: Execute (use `experiment_run`, `log_analyze`) |
| Run crashed / NaN loss | → `references/01-thinking-triggers.md`: scientific method |
| Results in, what now? | → Phase 4: Analyze (use `experiment_diff`) |
| Budget constrained | → `references/03-experiment-economics.md` |
| Need to verify what helped | → `references/04-ablation-methodology.md` |
| Metric delta questionable | → `references/01-thinking-triggers.md`: margin of safety |
| Need artifact templates | → `references/02-phase-templates.md` |

## Prerequisites

- A training script (any language, any framework)
- A measurable metric extractable from training output (loss, BPB, accuracy, F1, etc.)
- A way to run training (local GPU, cloud API, remote pod — anything)

## Investigation Integration

This skill works within the investigation model. Before starting:

1. Check for an active investigation: `investigation_status`
2. If none exists, create one: `investigation_create`
3. Use `hypothesis_add` to record each experiment hypothesis
4. After experiments, update hypotheses: `hypothesis_update`
5. Record findings: `finding_record`

Execution can follow three patterns:
- **Manual**: human picks each experiment step-by-step
- **Guided**: agent proposes experiments, human approves each
- **Auto-loop** (`/ml-loop`): agent cycles autonomously with budget constraints

## Quick Start

```
Phase 0: Assess → Phase 1: Research → Phase 2: Plan → [HUMAN GATE] → Phase 3: Execute → Phase 4: Analyze → [LOOP or STOP]
```

---

## Phase 0: Assess

**Goal:** Build a complete picture of the task before doing anything.

### Checklist

- [ ] Read project context (README, training script, eval scripts, experiment logs)
- [ ] Extract constraints: time budget, compute budget ($), artifact size limits, rules
- [ ] Identify metric: name, direction (minimize/maximize), how to extract from log output
- [ ] Identify data: training data location/format, eval data, tokenizer
- [ ] Establish baseline: current best result (from logs, results files, or ask user)
- [ ] Catalog dead ends: what's been tried and failed (from experiment logs, docs, git history)
- [ ] Catalog working techniques: what's proven to help
- [ ] Identify training command: how to launch a run, what env vars control hyperparameters
- [ ] Use `experiment_track action=create` to register the baseline experiment
- [ ] Use `dataset_profile` to analyze the training data

### Session Naming

Session ID = `YYYY-MM-DD-<short-tag>` (e.g., `2026-06-15-optimizer-sweep`).

### Gate

Present summary and confirm with user:

```
TASK ASSESSMENT
===============
Metric:    <name> (<direction>), baseline = <value>, target = <value>
Budget:    $<amount> (~<N> full runs at ~$<cost>/run)
Constraints: <time>, <size>, <rules>
Command:   <training command>

DEAD ENDS (top 5):
- <technique>: <result>

WORKING TECHNIQUES (top 5):
- <technique>: <result>
```

---

## Phase 1: Research

**Goal:** Find improvement ideas from web, arxiv, github, and competitors.

### Checklist

- [ ] **ML search** (3-5 queries): use `ml_search` with task-specific queries
- [ ] **Implementation search**: use `search_implementations` for techniques that look promising
- [ ] **Benchmark lookup**: use `search_benchmarks` to find SOTA on relevant datasets
- [ ] **Paper deep-dive**: use `search_paper` on the most relevant papers found
- [ ] **Cross-reference with dead ends**: filter out anything already tried
- [ ] **Rank candidates** by expected value: (impact × probability) / implementation_effort
  > **→ ml-thinking: Expected value trigger.** The highest-EV technique wins, not the most novel. A 60% chance of +0.01 for $5 beats a 10% chance of +0.05 for $50.

### Research Query Design

Effective queries combine the specific metric/task with the technique area:
- `"efficient transformer training" "bits per byte" quantization`
- `"language model" "mixed precision" "small model" under 50M parameters`
- `"image classification" pruning structured 2024..2026`

### Gate

Present top 5-10 candidates as a ranked list with expected impact and risk. Ask user to flag "don't try" or "prioritize."

---

## Phase 2: Plan

**Goal:** Generate a ranked, costed experiment plan.

### Checklist

- [ ] For each approved candidate: define ID, hypothesis, config changes, expected delta, cost estimate, dependencies
- [ ] Order by expected value: (expected_improvement × probability) / cost. Cheap first.
- [ ] Define abort criteria: N consecutive failures (default 3) with no improvement
- [ ] Budget check: sum estimated costs vs remaining budget

### Experiment Design Rules

1. **One variable at a time** when possible
2. **Screening first**: if technique can be validated cheaply, do that before full-scale
3. **Dependencies explicit**: if B needs A's result, mark it
4. **Code changes minimal**: prefer env var changes over code edits

### Gate (CRITICAL)

**No money is spent until user approves.**

```
EXPERIMENT PLAN
===============
Baseline: <metric> = <value>    Target: <value>    Budget: $<remaining>
Abort: after <N> consecutive failures

| # | Experiment | Expected Δ | Cost | Screening | Depends |
|---|-----------|-----------|------|-----------|---------|
| 1 | <name>    | <delta>   | $X   | yes/no    | -       |
| 2 | <name>    | <delta>   | $X   | no        | #1      |
Total estimated cost: $X

Approve? [approve / reorder / drop / add]
```

---

## Phase 3: Execute

**Goal:** Run each approved experiment with full artifact tracking.

### Per-Experiment Loop

For each experiment in plan order:

- [ ] `experiment_track action=create` — register the experiment
- [ ] `code_snapshot` — save current code state
- [ ] Apply config changes (env vars or code modifications)
- [ ] **Screening gate** (if applicable): run cheap pass first, skip full run if clearly worse
- [ ] `experiment_run` — execute training command
- [ ] Monitor: watch for completion or early failure (OOM, compile error)
- [ ] **On crash**: save partial log, mark `status=crashed`, ask user: retry/skip
  > **→ ml-thinking: Scientific method trigger.** If crash cause is unclear: enumerate hypotheses (OOM, data issue, code bug, infra), test cheapest observation first.
- [ ] **On completion**:
  - `log_analyze` — extract metrics
  - `experiment_track action=update` — record results and status
  - `code_snapshot` — save final state
- [ ] **Git decision**: code modified + improved → commit; not improved → revert
- [ ] **Abort check**: count consecutive failures, stop if threshold reached
- [ ] Print progress table

### Progress Table

```
PROGRESS (<completed>/<total>)
| # | Experiment | Metric | Δ | Cost | Status |
|---|-----------|--------|---|------|--------|
Best so far: <id> at <value>
Budget spent: $<X> of $<Y>
```

---

## Phase 4: Analyze & Loop

**Goal:** Analyze results, update state, decide whether to loop.

### Checklist

- [ ] Results table: all experiments sorted by metric (best first)
- [ ] `experiment_diff` — compare top 2-3 experiments to identify what drove improvements
  > **→ ml-thinking: Margin of safety trigger.** Are metric deltas larger than noise floor? Use stats module's `binomialExactTwoSided` for significance.
- [ ] Trend analysis: which directions showed promise? What consistently fails?
- [ ] Update dead ends and working techniques in experiment metadata
- [ ] Update baseline to best result from this batch
- [ ] **Assessment**:
  - Target reached → done
  - Improved but not at target → loop with narrower focus
  - No improvement → loop with different research direction
    > **→ ml-thinking: Inversion trigger.** Instead of "why didn't this work?", ask "what would have to be true for this to work?" Check each assumption.

### Gate

```
SESSION RESULTS
===============
Best: <experiment> at <metric> = <value> (Δ <delta>)
Target: <value> — <reached / X remaining>
Budget: $<spent> spent, $<remaining> remaining

Recommendation: <loop / stop / adjust>
[Loop / Stop / Adjust]
```

On **Loop**, return to Phase 1 with updated context. On **Stop**, session is complete.

---

## Rules

1. **NEVER run training without human approval of the experiment plan.** Phase 2 gate is sacred.
2. **NEVER modify training script without saving a snapshot first.**
3. **ALWAYS extract and record the metric** even from failed runs — partial results are data.
4. **ALWAYS save logs** even from crashed runs.
5. **Crashed runs do NOT count toward abort criteria.** Only completed-but-not-improved counts.
6. **One session per invocation.** Don't mix experiments from different sessions.
7. **Infrastructure-agnostic.** Never assume specific hardware. Use whatever the training command requires.
8. **Metric-agnostic.** Never hardcode any specific metric name. Use what the task defines.

## Hand-off

Receives a ranked experiment plan from `ml-research`. Produces a session summary with best results, updated dead ends, working techniques, and a recommendation (loop/stop). On loop, hands back to `ml-research` Phase 2 with updated context.

When stopping, update the investigation:
- `investigation_pause` if work may resume later
- `investigation_close` if the goal is met or abandoned
