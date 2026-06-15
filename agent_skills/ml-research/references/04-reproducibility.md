# Reproducibility Checklist

Same code + same data + same config → same result. Three pillars.

## Pillar 1 — Seed Everything

```python
import os, random, numpy as np, torch

def seed_everything(seed: int = 42):
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
```

For DataLoaders, also set `worker_init_fn` and a `generator` so workers are deterministic.

## Pillar 2 — Pin the Environment

- Pin exact versions: `requirements.txt` with `==`, or `uv.lock` / `poetry.lock`
- Record Python + CUDA + cuDNN versions in run metadata
- Containerize (Docker) for cross-machine reproducibility

## Pillar 3 — Version the Data

- Hash datasets (`sha256`) and log the hash with every run
- Use DVC or dataset snapshots; never overwrite `data.csv` in place
- Treat data as immutable inputs keyed by version (`data_v="2026-06-01"`)

## Determinism Gotchas

| Gotcha | Fix |
|--------|-----|
| GPU reductions nondeterministic | `torch.use_deterministic_algorithms(True)` + `CUBLAS_WORKSPACE_CONFIG=:4096:8` |
| Parallel groupby/apply ordering varies | Sort before reducing |
| set/dict ordering across processes | Set `PYTHONHASHSEED` |
| Non-pinned deps silently change behavior | Always pin exact versions |
| Seeding only NumPy but using PyTorch RNG | Seed ALL random sources (see function above) |
| Notebook hidden execution order | Move logic to `src/`, run via script |
