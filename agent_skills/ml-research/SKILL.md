---
name: ml-research
description: Use when analyzing ML competitions/challenges, improving model performance under constraints (size, compute, time), designing experiment plans, researching SOTA techniques, reviewing training logs, or user asks "how can I improve my model/score/metric".
version: "1.0"
---

# ML Research Investigator

## Trigger Card

When facing an ML optimization problem: **decompose constraints → research techniques with quantitative estimates → plan ablation-friendly experiments ordered by expected value → review results and iterate.** Think in bits, not vibes. Respect ALL constraint surfaces. Leaderboard archaeology before invention.

## Quick Reference

| Trigger | Action |
|---------|--------|
| Starting a new ML task/competition | → Phase 1: Problem Decomposition |
| Need technique ideas | → Phase 2: Technique Research + `references/01-source-discovery.md` |
| Training fails, loss is NaN/stuck | → `references/03-ml-debugging.md` + thinking: scientific method |
| Results vary run-to-run | → `references/04-reproducibility.md` |
| Kaggle-specific workflow | → `references/05-kaggle-patterns.md` |
| Combining multiple techniques | → `references/06-technique-interactions.md` |
| Multiple competing constraints | → `references/07-constraint-pareto.md` |
| Designing experiment sequence | → Phase 3: Experiment Plan |
| About to commit $$ to a plan | → `references/08-ml-decision-frameworks.md`: pre-mortem |
| Training is slow, not sure what to optimize | → `references/08-ml-decision-frameworks.md`: theory of constraints |
| Spending too long on one approach | → `references/08-ml-decision-frameworks.md`: opportunity cost |
| Reviewing training logs | → Phase 4: Log Analysis |
| Results don't match expectations | → thinking: inversion trigger |

## When to Use

- Analyzing ML competitions, challenges, or constrained optimization problems
- Improving model performance under constraints (size, compute, latency, memory)
- Analyzing training logs and figuring out what to try next
- Designing a prioritized experiment plan for a constrained ML task

## When NOT to Use

- Pure software engineering with no ML optimization
- Running an existing training script without changes
- Data collection/labeling tasks

## Core Workflow

### Phase 1: Problem Decomposition

Before suggesting anything, fully understand the problem. Read all available materials and extract:

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

Search aggressively using available tools:

- **ArXiv / Semantic Scholar** — recent papers on the specific constraint regime
- **PapersWithCode** — benchmarks, leaderboards, linked code repos
- **GitHub** — implementations of promising techniques (filter by stars, framework)
- **HuggingFace** — pre-trained models and datasets relevant to the task
- **Web search** — blog posts, competition write-ups, discussion threads

> **→ ml-thinking: Expected value trigger.** Rank by (expected_improvement × probability) / cost. The highest-EV technique wins, not the most novel.

For each technique found, evaluate:
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

When reviewing training logs:

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

**Leaderboard archaeology is high-ROI.** Before inventing anything, analyze what existing top entries did.

**Diminishing returns are real.** The first technique in a category gives biggest gain. The fifth variant is usually noise.

**Interactions matter more than isolated effects.** QAT + pruning + distillation don't add up. Flag expected synergies and conflicts.

**The eval strategy IS part of the model.** Test-time training, sliding window, context length tricks can be as impactful as architecture changes.

## Output Format

- **Challenge analysis** → Full Phase 1 + Phase 2 top techniques + Phase 3 experiment plan
- **"What should I try next?"** → Phase 4 log analysis + updated top-3 experiments
- **Specific technique question** → Deep dive with evidence, expected impact, implementation notes
- **Training log review** → Phase 4 analysis with specific actionable recommendations

Always end with a clear **"Next step"** — the single highest-value action to take right now.

## Hand-off

Delivers a ranked experiment plan with quantitative estimates. The `experiment-loop` skill takes this plan and executes it with artifact tracking, human gates, and session management.
