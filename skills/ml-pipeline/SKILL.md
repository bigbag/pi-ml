---
name: ml-pipeline
description: End-to-end ML pipeline guide covering problem definition through deployment. Use when starting a new ML project, structuring an investigation, or needing stage-specific guidance on data handling, modeling, evaluation, or deployment.
---

# ML Pipeline Guide

## Trigger Card

Follow the pipeline stages in order. Each stage has a key question — answer it before moving on. Use `investigation_create` to track the full pipeline as an investigation. Record findings at each stage. Run leakage checks at stages 3, 4, and 5.

## Quick Reference

| Stage | Key Question | Primary Tool |
|-------|-------------|-------------|
| 1. Problem Definition | "What decision changes if this model works?" | `investigation_create` |
| 2. Data Collection | "Is my data representative of production?" | `dataset_profile` |
| 3. EDA | "Where are the leaks and biases?" | `dataset_profile`, `leak_check` |
| 4. Feature Engineering | "Will this feature exist at inference time?" | `leak_check` |
| 5. Train/Val/Test Split | "Is my validation strategy realistic?" | `cv_split`, `leak_preflight` |
| 6. Model Selection | "Does this beat a simple baseline?" | `experiment_run` |
| 7. Tuning | "Am I tuning the right metric?" | `experiment_run` |
| 8. Evaluation | "Would I bet money on this test result?" | `statistical_test` |
| 9. Interpretability | "Can I explain why this prediction was made?" | `analyze_output` |
| 10. Deployment | "Can I debug this in production?" | — |
| 11. Monitoring | (recommendations only) | — |
| 12. Documentation | (recommendations only) | — |

## Opinionated Stack

| Domain | Library | Use When |
|--------|---------|----------|
| DataFrames | polars | Always — faster and more correct than pandas |
| GBDT | LightGBM | Tabular data, first model to try |
| Deep Learning | PyTorch | Sequences, images, custom architectures |
| Pretrained | HuggingFace Transformers | NLP, vision with pretrained models |
| Features | scikit-learn + polars expressions | Encoding, scaling, selection |
| Tuning | Optuna | Hyperparameter search |
| Tracking | Built-in ml-agent/ journal | No external dependency |

---

## Stage 1: Problem Definition & Scoping

**Key question: "What decision changes if this model works?"**

### Checklist

- [ ] Define the business goal in one sentence
- [ ] Choose success metrics: accuracy, precision, recall, RMSE, AUC, or business KPI
- [ ] Assess ML feasibility: do you have data? Is the pattern learnable? Would a heuristic suffice?
- [ ] Set constraints: latency, interpretability, fairness, budget, timeline
- [ ] Create investigation: `investigation_create` with goal, dataset, problem type, constraints

### Integration

```
investigation_create goal="<business goal>" dataset="<path>" problemType="<type>" constraints=["<constraint1>", "<constraint2>"]
```

Record the problem definition as a finding for future reference:
```
finding_record type="decision" text="<problem definition summary>" tags=["problem-definition"]
```

---

## Stage 2: Data Collection & Ingestion

**Key question: "Is my data representative of production?"**

### Checklist

- [ ] Identify all data sources
- [ ] Profile the dataset: `dataset_profile path="<data_path>"`
- [ ] Check for version/snapshot metadata
- [ ] Document provenance: where did this data come from?

### Red Flags

- Training data from a different time period than production
- Sampling bias (only successful cases, survivorship bias)
- Missing important subgroups

---

## Stage 3: Exploratory Data Analysis

**Key question: "Where are the leaks and biases?"**

### Checklist

- [ ] Profile distributions: `dataset_profile path="<data_path>" targetColumn="<target>"`
- [ ] Check missing values, cardinality, outliers
- [ ] **LEAKAGE CHECK**: `leak_check dataPath="<path>" targetCol="<target>"` — check for target contamination
- [ ] Check for duplicate/near-duplicate records
- [ ] Form hypotheses about which features matter: `hypothesis_add`
- [ ] Search for prior work: `knowledge_search problemType="<type>"`

### Leakage Checkpoint

Run `leak_check` before any modeling. Look for:
- Features with suspiciously high correlation to target (>0.95)
- Timestamp columns that might leak future information
- ID-like columns that might proxy for the target

---

## Stage 4: Data Preprocessing & Feature Engineering

**Key question: "Will this feature exist at inference time?"**

### Checklist

- [ ] Handle missing values (imputation, deletion, or model-native)
- [ ] Encode categoricals (target encoding for high-cardinality, one-hot for low)
- [ ] Scale/normalize numeric features
- [ ] Engineer domain-specific features
- [ ] **LEAKAGE CHECK**: verify every feature will be available at inference time
- [ ] Check `knowledge_search category="feature-engineering"` for relevant patterns

### Polars Patterns (preferred over pandas)

```python
import polars as pl

df = pl.read_csv("data.csv")

# Feature engineering with expressions
df = df.with_columns([
    (pl.col("price") / pl.col("sqft")).alias("price_per_sqft"),
    pl.col("date").str.to_datetime().dt.month().alias("month"),
    pl.col("category").cast(pl.Categorical),
])
```

### Anti-patterns

- Fitting scaler/encoder on full data before split — fit on train only
- Using future information in time-series features
- Creating features from the target column

---

## Stage 5: Train-Validation-Test Split

**Key question: "Is my validation strategy realistic?"**

### Checklist

- [ ] Choose split strategy based on data structure:
  - Random/stratified for i.i.d. tabular data
  - Time-based for temporal data
  - Group-based when entities span multiple rows
- [ ] Generate splits: `cv_split`
- [ ] **LEAKAGE PREFLIGHT**: `leak_preflight` — validates split strategy against data structure
- [ ] Verify holdout test set is truly held out — never touch until final evaluation

### Decision Guide

| Data Structure | Split Strategy | Why |
|---------------|---------------|-----|
| Balanced i.i.d. | Random k-fold | Standard, unbiased |
| Imbalanced classes | Stratified k-fold | Preserves class ratios |
| Time-series | Time-series split | Prevents future leakage |
| Multi-row entities | Group k-fold | Prevents entity leakage |

---

## Stage 6: Model Selection & Baseline

**Key question: "Does this beat a simple baseline?"**

### Checklist

- [ ] Start simple: linear/logistic regression or small decision tree
- [ ] Record baseline: `experiment_run` + `hypothesis_add text="baseline establishes floor"`
- [ ] Try LightGBM (default for tabular): `experiment_run`
- [ ] Match algorithm to problem type:
  - Tabular → LightGBM/XGBoost
  - Images → CNN/ViT (PyTorch)
  - Text → HuggingFace Transformer
  - Time series → temporal models
- [ ] **Do NOT tune hyperparameters yet** — default params first

### LightGBM Baseline

```python
import lightgbm as lgb

model = lgb.LGBMClassifier(  # or LGBMRegressor
    n_estimators=500,
    learning_rate=0.05,
    num_leaves=31,
    verbose=-1,
)
model.fit(X_train, y_train, eval_set=[(X_val, y_val)], callbacks=[lgb.early_stopping(50)])
```

---

## Stage 7: Model Training & Hyperparameter Tuning

**Key question: "Am I tuning the right metric?"**

### Checklist

- [ ] Set up reproducible pipeline: fixed random seeds, deterministic ops
- [ ] Tune with Optuna: `experiment_run` for each trial
- [ ] Track all experiments in journal
- [ ] Monitor overfitting: training vs validation curves, early stopping
- [ ] Record hypotheses about what parameters matter: `hypothesis_add`

### Optuna Pattern

```python
import optuna

def objective(trial):
    params = {
        "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
        "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 15, 127),
        "min_child_samples": trial.suggest_int("min_child_samples", 5, 100),
    }
    model = lgb.LGBMClassifier(**params, verbose=-1)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)], callbacks=[lgb.early_stopping(50)])
    return model.best_score_["valid_0"]["binary_logloss"]

study = optuna.create_study(direction="minimize")
study.optimize(objective, n_trials=50)
```

---

## Stage 8: Model Evaluation & Validation

**Key question: "Would I bet money on this test result?"**

### Checklist

- [ ] Evaluate on holdout test set — use the metrics defined in Stage 1
- [ ] Check significance: `statistical_test`
- [ ] Analyze errors: confusion matrix, residual plots, worst-case examples
- [ ] Check robustness: cross-validation stability, performance on data slices
- [ ] Fairness audit if applicable: performance across demographic groups
- [ ] Record findings: `finding_record type="insight"`

### Significance Check

Use the built-in `statistical_test` tool before claiming any improvement:
- For classification: McNemar's test or binomial exact test
- For regression: paired t-test or Wilcoxon signed-rank
- Rule of thumb: if improvement < run-to-run variance, it's noise

---

## Stage 9: Model Interpretability & Debugging

**Key question: "Can I explain why this prediction was made?"**

### Checklist

- [ ] Global explanations: feature importance, SHAP summary plots
- [ ] Local explanations: SHAP values for individual predictions
- [ ] Debug failures: where does the model fail? Why?
- [ ] Sanity checks: predictions on obvious cases
- [ ] Use `diagnose` if results are unexpected

---

## Stage 10: Model Packaging & Deployment

**Key question: "Can I debug this in production?"**

### Checklist

- [ ] Serialize the model: pickle, ONNX, TorchScript
- [ ] Build inference API if needed: FastAPI recommended
- [ ] Pin all dependencies with exact versions
- [ ] Write inference tests: known inputs → expected outputs
- [ ] Document the model: inputs, outputs, limitations, failure modes

---

## Stage 11: Monitoring (Recommendations Only)

When asked about monitoring, recommend:

- **Data drift detection**: track input distributions with statistical tests (KS-test, PSI)
- **Performance drift**: monitor production metrics over time
- **Alerting**: set up thresholds for retraining triggers
- **Retraining strategy**: scheduled, event-driven, or performance-triggered
- **Model versioning**: A/B tests, shadow deployments for safe rollouts

---

## Stage 12: Documentation (Recommendations Only)

When asked about documentation, recommend:

- **Pipeline documentation**: architecture diagrams, data schemas, assumptions
- **Runbooks**: how to debug, retrain, and rollback
- **Testing**: unit tests for data transformations, integration tests for inference
- **Stakeholder communication**: what the model does, its limitations, how to use it

---

## Iteration

The pipeline is iterative. Common loops:

- **Evaluation → Feature Engineering**: poor results suggest missing features
- **Evaluation → Model Selection**: wrong algorithm for the problem
- **Debugging → EDA**: unexpected behavior points to data issues
- **Monitoring → Retraining**: drift triggers a new cycle

Use the investigation model to track iterations. Each loop back should be a new hypothesis with rationale for why the previous approach fell short.
