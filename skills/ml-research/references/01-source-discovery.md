# ML Source Discovery — ML Research Discovery

## Trigger Card

**Don't just list papers.** Interleave retrieval with reasoning: broad search → extract facts → reason about relevance → deep dive on promising leads → synthesize into actionable experiment suggestions. Evidence-first: specific metrics, code URLs, and constraint-matched techniques — not summaries.

## Multi-Source Fan-Out

Search across ALL relevant sources in parallel — each catches what others miss:

| Source | Best for |
|--------|----------|
| ArXiv | Latest papers, preprints, theoretical foundations |
| PapersWithCode | Papers → code → benchmarks (highest value for ML) |
| Semantic Scholar | Citation counts, TLDRs, cross-references |
| GitHub | Working implementations, training recipes, competition solutions |
| HuggingFace | Pre-trained models, datasets, model cards |
| Web (SearxNG/DuckDuckGo) | Blog posts, discussions, competition write-ups |

## Query Design

Effective ML research queries combine specifics:
- `"efficient transformer" "under 50M parameters" quantization 2024..2026`
- `"knowledge distillation" "language model" bits-per-byte`
- `site:github.com "kaggle" "1st place" image-classification`

Avoid generic queries like "how to train better models."

## Multi-Step Search (IRCoT Pattern)

Don't do one search and stop. Interleave retrieval with reasoning:

1. **Broad search** → get 10-20 results across sources
2. **Extract** → identify techniques, metrics, constraint regimes mentioned
3. **Reason** → which results are relevant to YOUR specific constraints?
4. **Deep dive** → fetch full details on the 3-5 most relevant papers/repos
5. **Cross-reference** → do different sources corroborate the same technique?
6. **Synthesize** → produce actionable suggestions with evidence

## Result Evaluation

For each result, extract structured facts:

- **Techniques used**: specific method names (QAT, LoRA, pruning, etc.)
- **Metrics achieved**: concrete numbers on specific datasets
- **Constraints**: model size, training time, hardware used
- **Code availability**: is there a working implementation?
- **Recency**: how recent is this work?
- **Citations/Stars**: social proof of quality

## Experience-Driven Filtering

Before presenting results, cross-reference with known state:
- **Dead ends**: penalize results about techniques already tried and failed
- **Working techniques**: boost results that extend what's already proven
- **Constraint fit**: filter out results that violate the problem's constraints

## Output Format

Structure results by type, not by source:

```
PAPERS (5):
[1] "Title" (year) | Citations: N | Code: url
    Techniques: QAT, pruning | Key metric: acc=95.2% on ImageNet
    
CODE (3):
[1] repo-name (PyTorch) ★ 1.2k
    url | Techniques: distillation | License: MIT

MODELS (2):
[1] model-name (125M params) ↓ 12k downloads
    url | Framework: PyTorch | Task: text-generation
```

## Anti-Patterns

- **Don't just list results.** Extract and structure the facts.
- **Don't search once.** Iterate: initial search → reason → deeper search.
- **Don't ignore constraints.** A great technique that violates size limits is worthless.
- **Don't trust titles alone.** Read abstracts/READMEs for actual methodology.
- **Don't skip dead-end filtering.** Presenting already-tried techniques wastes time.
