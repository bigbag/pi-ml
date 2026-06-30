---
name: ml-research
description: Investigate ML research, papers, techniques, competitions, or constrained optimization problems. Use when analyzing challenges, improving model performance under constraints, designing experiment plans, or reviewing training logs.
---

# ML Research Investigator

## Trigger Card

When facing an ML optimization problem: **decompose constraints → research techniques with quantitative estimates → plan ablation-friendly experiments ordered by expected value → review results and iterate.** Think in bits, not vibes. Respect ALL constraint surfaces. Leaderboard archaeology before invention.

## Quick Reference

| Trigger | Action |
|---------|--------|
| Starting a new ML task/competition | → Phase 1: Problem Decomposition |
| Need technique ideas | → Phase 2 + `references/01-source-discovery.md` |
| Training fails, loss NaN/stuck | → `references/03-ml-debugging.md` |
| Results vary run-to-run | → `references/04-reproducibility.md` |
| Kaggle-specific workflow | → `references/05-kaggle-patterns.md` |
| Combining multiple techniques | → `references/06-technique-interactions.md` |
| Multiple competing constraints | → `references/07-constraint-pareto.md` |
| About to commit $$ to a plan | → `references/08-ml-decision-frameworks.md`: pre-mortem |
| Training slow, not sure what to optimize | → `references/08-ml-decision-frameworks.md`: theory of constraints |

## When to Use

- User shares a competition/challenge and wants to understand the optimization surface
- User asks how to improve a model under constraints (size, compute, latency, memory)
- User wants to analyze training logs and figure out what to try next
- User needs a prioritized experiment plan for a constrained ML task
- User asks "how can I improve my model/score/metric"

## When NOT to Use

- Pure software engineering task with no ML optimization component
- User just wants to run an existing training script without changes
- Data collection/labeling tasks (no model optimization involved)

## Core Workflow

### Phase 0: Check Prior Knowledge

Before researching from scratch, check what you already know:

```
knowledge_search problemType="<type>" category="<relevant-category>"
journal_query type="experiments" filter={"config": {"model": "<similar-model>"}}
journal_query type="findings" filter={"tags": ["<relevant-tag>"]}
```

Past investigations, experiments, and learnings can shortcut the research phase. If you've solved a similar problem before, start from what worked.

### Phase 1: Problem Decomposition

Before suggesting anything, fully understand the problem. Use `dataset_profile` to analyze data, read available materials, and extract.

> **→ ml-thinking: First principles trigger.** For each constraint, ask: is this physics or convention? Constraints that look fixed may be negotiable.


**Constraints** — the hard walls:
- Model size budget (parameters, compressed bytes, artifact size)
- Compute budget (GPU type, count, wall-clock time)
- Evaluation rules (metrics, what's allowed during eval, test-time compute)
- Code constraints (single file, line limits, no external downloads)

**Optimization Target** — what you're minimizing/maximizing:
- The exact metric (loss, BPB, accuracy, latency)
- How it's computed (tokenizer-agnostic? sliding window? sequence length?)
- Statistical requirements (significance level, number of runs)

**Degrees of Freedom** — where you CAN move:
- Architecture (depth, width, attention variants, MLP design, normalization)
- Training recipe (optimizer, LR schedule, batch size, sequence length, data ordering)
- Quantization/compression (bit-width, QAT vs PTQ, compression algorithm)
- Tokenizer (vocabulary size, algorithm)
- Evaluation strategy (test-time training, sliding window, context length)

**Current State:**
- Baseline performance and techniques already used
- Leaderboard SOTA and techniques that got there
- Gap between baseline and SOTA (headroom remaining)
- Which techniques show diminishing returns vs untapped potential

### Phase 2: Technique Research

Search aggressively using the available tools:

```
ml_search query="<technique> <constraint regime>" sources=["pwc","semantic-scholar","arxiv"]
search_implementations technique="<name>" framework="pytorch" minStars=50
search_benchmarks dataset="<name>" task="<task>"
```

For each technique found, evaluate:

> **→ ml-thinking: Expected value trigger.** Rank by (expected_improvement × probability) / cost. The highest-EV technique wins, not the most novel.

1. **Expected impact** — how many nats/bits/points could this realistically gain?
2. **Implementation complexity** — hours of work vs quick wins
3. **Interaction effects** — composes well with existing techniques or conflicts?
4. **Risk** — could this make things worse? Hard to debug?

Provide for each candidate:
- **What**: one-line description
- **Why it helps here**: specific to this problem's constraints
- **Expected gain**: rough quantitative estimate with reasoning
- **Cost**: implementation effort, training overhead, risk
- **Evidence**: papers, results from similar settings, leaderboard entries

### Phase 3: Experiment Plan

Design an ordered sequence following these rules:

- **Quick wins first**: low-effort changes with clear expected improvement
- **Foundation before refinement**: architectural changes before hyperparameter tuning
- **Independent experiments in parallel**: flag when two changes affect different parts
- **Ablation-friendly**: each experiment changes one thing so contribution is measurable

For each experiment:
- Hypothesis: what you expect and why
- Changes: specific code/config changes
- Baseline: what to compare against
- Success metric: how to know if it worked (including statistical bar)
- Expected gain: quantitative estimate
- Risk: what could go wrong
- Time estimate: GPU-hours or wall-clock

> **→ ml-thinking: Margin of safety trigger.** For each success metric, verify: is the expected gain larger than run-to-run variance? How many runs to prove significance?

### Phase 4: Log Analysis

When reviewing training logs (use `log_analyze`):

1. **Extract key metrics**: final loss/BPB, training curve shape, artifact size, wall-clock time
2. **Compare to expectations**: did the experiment hit its predicted gain? If not, why?
3. **Diagnose issues**: underfitting (loss still dropping), overfitting (train/val gap), instability (loss spikes), wasted budget (plateau reached early)
   > **→ ml-thinking: Scientific method trigger.** When failure cause is unclear: enumerate 3-5 falsifiable hypotheses, test cheapest discriminating observation first.
4. **Identify next moves**: based on results, what's the highest-value next experiment?
5. **Update the plan**: revise expected gains and ordering based on new evidence

Be specific. "Loss is still decreasing" is useless. "val_bpb dropped 0.003 in the last 20% of training, suggesting ~0.001-0.002 more gains from longer training or LR schedule tweaks" is actionable.

## Research Principles

**Think in bits, not vibes.** Every suggestion comes with a rough quantitative estimate.

**Respect the constraint surface.** A technique that improves loss by 0.02 but adds 2MB is worthless if you're at 15.5MB of a 16MB limit.

**Leaderboard archaeology is high-ROI.** Before inventing anything, analyze what existing top entries did. The progression from baseline to SOTA tells you which techniques had biggest marginal impact.

**Diminishing returns are real.** The first technique in a category gives biggest gain. The fifth variant is usually noise. Know when to move to a different axis.

**Interactions matter more than isolated effects.** QAT + pruning + distillation don't add up. Some combinations are synergistic, others destructive. Flag expected interactions.

**The eval strategy IS part of the model.** Test-time training, sliding window, context length tricks can be as impactful as architecture changes.

## Output Format

- **Challenge analysis** → Full Phase 1 decomposition + Phase 2 top techniques + Phase 3 experiment plan
- **"What should I try next?"** → Phase 4 log analysis + updated top-3 experiments
- **Specific technique question** → Deep dive with evidence, expected impact, implementation notes
- **Training log review** → Phase 4 analysis with specific actionable recommendations

Always end with a clear **"Next step"** — the single highest-value action to take right now.

### Record Findings

After completing research, record key findings for future reference:

```
finding_record type="insight" text="<key finding>" tags=["research", "<topic>"] sourceExperiments=[]
```

If a research finding is broadly applicable (not just to this investigation), save it as a learning:

```
learning_save text="<generalized insight>" evidence=[] tags=["<category>", "<topic>"]
```

## Hand-off

Delivers a ranked experiment plan with quantitative estimates. The `experiment-planning` skill takes this plan and executes it with artifact tracking, human gates, and session management using pi-ml tools (`experiment_track`, `experiment_run`, `log_analyze`).
