---
description: Investigate ML research, papers, techniques, competitions, or constrained optimization problems.
---

# ML Research Investigator

Use this skill when the user asks about machine learning research, papers, techniques, competitions, or constrained optimization problems.

## When to Use

- Analyzing Kaggle or ML competition descriptions
- Researching quantization, pruning, distillation, or model compression
- Understanding training recipes, optimizers, or LR schedules
- Reviewing experiment results and planning next steps
- Investigating SOTA techniques for a specific constraint regime

## Approach

1. **Decompose the problem** — identify constraints (model size, compute budget, latency), optimization target (metric), degrees of freedom, and current state.
2. **Research before inventing** — search papers, leaderboards, and code repos. Use `web_search` to find relevant work.
3. **Quantify everything** — every suggestion must include a rough estimate of expected gain (e.g., "Int8 QAT saves ~0.5MB with <0.01 BPB loss").
4. **Account for interactions** — techniques don't simply add up. Flag expected synergies and conflicts.
5. **Plan ablation-friendly experiments** — each experiment changes one thing so you can measure its contribution.

## Key Principles

- Think in bits and quantitative estimates, not vibes.
- Respect ALL constraint surfaces. A technique that improves loss by 0.02 but adds 2MB is worthless if the artifact limit is 16MB.
- Perform leaderboard archaeology before inventing anything.
- The eval strategy IS part of the model. Test-time tricks can be as impactful as architecture changes.
- Always cite sources when making claims about technique effectiveness.
