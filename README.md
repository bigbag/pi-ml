# pi-ml — ML Research & Competition Tools for pi

A `pi` extension that brings machine learning research and competition tools to the [pi coding agent](https://github.com/earendil-works/pi).

Track experiments, manage artifacts, search ArXiv/web, analyze training logs, profile datasets, manage cross-validation, and run experiments — all within pi's interactive TUI.

## Install

```bash
pi install npm:pi-ml
```

Or load directly for development:
```bash
pi -e ./src/index.ts
```

## Features

- **Experiment Tracking** — JSONL-based experiment store with create/update/list/get
- **Artifact Registry** — Register, compare, tag, and retrieve experiment outputs
- **Experiment Runner** — Execute training scripts with output capture
- **Dataset Profiler** — Auto-detect column types, distributions, correlations, target analysis
- **CV Manager** — Generate stratified/group/time-series cross-validation folds
- **Experiment Diff** — Side-by-side comparison of code, config, hyperparameters, and results
- **Log Analyzer** — Parse training logs and extract metrics (loss, accuracy, etc.)
- **Web/ArXiv Search** — Research papers and techniques without leaving pi
- **Code Snapshots** — Git diff snapshots for reproducibility
- **Leaderboard Command** — `/ml-leaderboard` sorts experiments by best metric

## Tools

| Tool | Description |
|------|-------------|
| `dataset_profile` | Analyze dataset: type inference, statistics, correlations, target detection |
| `cv_manager` | Generate CV folds: stratified_kfold, kfold, group_kfold, time_series_split |
| `experiment_diff` | Compare two experiments: code, config, hyperparameters, metrics |
| `experiment_track` | Create/update/list/get experiments |
| `experiment_run` | Execute training scripts, capture outputs |
| `log_analyze` | Parse logs, extract metrics |
| `web_search` | Search ArXiv and web for papers/techniques |
| `code_snapshot` | Snapshot codebase via git diff |
| `artifact_list` | List artifacts with filters |
| `artifact_get` | Retrieve artifact content |
| `artifact_compare` | Diff two artifacts |
| `artifact_tag` | Tag artifacts |

## Skills

- `ml-research` — Investigative framework for ML problems
- `experiment-planning` — Structured experiment design

Invoke with `/skill:ml-research` or `/skill:experiment-planning`.

## Prompt Templates

- `/analyze-competition` — Break down an ML competition
- `/review-experiment` — Review experiment results

## Commands

| Command | Description |
|---------|-------------|
| `/ml-leaderboard` | Show experiments sorted by best metric |

## Data Storage

All data is stored in `.ml-agent/` in the project root:
- `.ml-agent/store/` — Artifact storage
- `.ml-agent/registry.jsonl` — Artifact registry
- `.ml-agent/experiments.jsonl` — Experiment metadata
- `.ml-agent/search-cache/` — Cached search results

## Usage Example

```
> /skill:ml-research
> I need to analyze the LLM efficiency competition. Constraints: 16MB model, 10 min training.

[agent uses web_search to research, then proposes experiment sequence]

> dataset_profile experimentId=exp1 datasetPath=./data/train.csv targetColumn=label
> cv_manager experimentId=exp1 datasetPath=./data/train.csv targetColumn=label strategy=stratified_kfold nSplits=5
> experiment_track action=create experimentId=exp1 name="baseline-gpt2"
> experiment_run experimentId=exp1 command="python train.py" workingDir=./src
> log_analyze experimentId=exp1
> artifact_list experimentId=exp1
> /ml-leaderboard

[agent creates exp2 with different hyperparameters]
> experiment_diff experimentIdA=exp1 experimentIdB=exp2
```

## Configuration

Persistent settings in `.pi/pi-ml.json` (project) or `~/.pi/agent/pi-ml.json` (global):

```json
{
  "maxExperimentsInLeaderboard": 20,
  "defaultArtifactTags": ["baseline"]
}
```

## Architecture

```
src/
  index.ts              # Extension entry point
  types.ts              # Shared types
  settings.ts           # Persistent settings
  core/                 # Artifact registry, experiment store, runner, dataset profiler, CV splitter
  search/               # DeepSearch (ArXiv + web)
  tools/                # Tool definitions
  ui/                   # Custom rendering
skills/
  ml-research/SKILL.md
  experiment-planning/SKILL.md
prompts/
  analyze-competition.md
  review-experiment.md
```

## Peer Dependencies

- `@earendil-works/pi-coding-agent`
- `@earendil-works/pi-ai`
- `@earendil-works/pi-agent-core`
- `typebox`

## License

MIT
