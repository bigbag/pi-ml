import type { KnowledgeStore } from "./knowledge.js"
import type { PatternRecord } from "../types/knowledge.js"

const SEED_PATTERNS: Omit<PatternRecord, "id">[] = [
  // Feature Engineering
  {
    category: "feature-engineering",
    problemType: "tabular",
    technique: "target-encoding",
    whenToUse: "High-cardinality categoricals (>20 unique values) where one-hot encoding creates too many sparse columns",
    gotchas: "Must use fold-based encoding to avoid data leakage. Fit on training folds only.",
    codeTemplate: `import polars as pl
from category_encoders import TargetEncoder
te = TargetEncoder(cols=["category_col"], smoothing=1.0)
X_train["category_col_enc"] = te.fit_transform(X_train[["category_col"]], y_train)
X_val["category_col_enc"] = te.transform(X_val[["category_col"]])`,
    source: "pre-seeded",
  },
  {
    category: "feature-engineering",
    problemType: "tabular",
    technique: "frequency-encoding",
    whenToUse: "Categorical features where frequency of occurrence is informative (e.g. rare vs common categories)",
    gotchas: "Compute frequencies on training data only. Unseen categories in test get 0 or a default.",
    codeTemplate: `df = df.with_columns(
    pl.col("cat").count().over("cat").alias("cat_freq")
)`,
    source: "pre-seeded",
  },
  {
    category: "feature-engineering",
    problemType: "tabular",
    technique: "interaction-features",
    whenToUse: "When domain knowledge suggests two features have a combined effect (e.g. price * quantity = revenue)",
    gotchas: "Can explode feature space. Use with feature selection. Only create interactions with domain justification.",
    codeTemplate: `df = df.with_columns(
    (pl.col("price") * pl.col("quantity")).alias("revenue"),
    (pl.col("area") / pl.col("rooms")).alias("area_per_room"),
)`,
    source: "pre-seeded",
  },
  {
    category: "feature-engineering",
    problemType: "tabular",
    technique: "time-based-features",
    whenToUse: "Datetime columns — extract cyclical and calendar features",
    gotchas: "Use sin/cos encoding for cyclical features (hour, day of week). Avoid future-leaking features.",
    codeTemplate: `import numpy as np
df = df.with_columns(
    pl.col("timestamp").dt.hour().alias("hour"),
    pl.col("timestamp").dt.weekday().alias("dow"),
    (np.sin(2 * np.pi * pl.col("timestamp").dt.hour() / 24)).alias("hour_sin"),
    (np.cos(2 * np.pi * pl.col("timestamp").dt.hour() / 24)).alias("hour_cos"),
)`,
    source: "pre-seeded",
  },

  // Model Selection
  {
    category: "model-selection",
    problemType: "tabular-regression",
    technique: "lightgbm-baseline",
    whenToUse: "Default first model for tabular regression. Fast, handles missing values, robust to scale.",
    gotchas: "Set verbose=-1 to silence output. Use early_stopping_rounds with a validation set.",
    codeTemplate: `import lightgbm as lgb
model = lgb.LGBMRegressor(
    n_estimators=1000, learning_rate=0.05,
    num_leaves=31, min_child_samples=20,
    verbose=-1,
)
model.fit(X_train, y_train,
    eval_set=[(X_val, y_val)],
    callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)])`,
    source: "pre-seeded",
  },
  {
    category: "model-selection",
    problemType: "tabular-classification",
    technique: "lightgbm-classifier",
    whenToUse: "Default first model for tabular classification. Handles imbalance via is_unbalance.",
    gotchas: "For multiclass, set objective='multiclass' and num_class. Use eval_metric matching your goal.",
    codeTemplate: `import lightgbm as lgb
model = lgb.LGBMClassifier(
    n_estimators=1000, learning_rate=0.05,
    num_leaves=31, is_unbalance=True,
    verbose=-1,
)
model.fit(X_train, y_train,
    eval_set=[(X_val, y_val)],
    callbacks=[lgb.early_stopping(50)])`,
    source: "pre-seeded",
  },
  {
    category: "model-selection",
    problemType: "tabular",
    technique: "ensemble-stacking",
    whenToUse: "When you need maximum predictive performance and have multiple diverse models already trained",
    gotchas: "Use out-of-fold predictions for meta-features to avoid leakage. Keep the meta-learner simple (linear/logistic).",
    codeTemplate: `from sklearn.linear_model import RidgeCV
# oof_preds shape: (n_train, n_models)
meta_model = RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0])
meta_model.fit(oof_preds, y_train)`,
    source: "pre-seeded",
  },
  {
    category: "model-selection",
    problemType: "sequence",
    technique: "pytorch-lstm",
    whenToUse: "Sequence modeling (text, time series) when transformers are overkill or data is limited",
    gotchas: "Pack sequences for variable lengths. Use bidirectional for classification, unidirectional for generation.",
    codeTemplate: `import torch.nn as nn
class LSTMModel(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, n_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, n_layers, batch_first=True, dropout=0.2)
        self.fc = nn.Linear(hidden_dim, output_dim)
    def forward(self, x):
        _, (h, _) = self.lstm(x)
        return self.fc(h[-1])`,
    source: "pre-seeded",
  },

  // Tuning
  {
    category: "tuning",
    problemType: "tabular",
    technique: "optuna-lightgbm",
    whenToUse: "Bayesian hyperparameter search for LightGBM. More efficient than grid/random search.",
    gotchas: "Use pruning to stop unpromising trials early. Set n_trials based on budget (50-200 is typical).",
    codeTemplate: `import optuna
def objective(trial):
    params = {
        "n_estimators": 1000,
        "learning_rate": trial.suggest_float("lr", 0.01, 0.3, log=True),
        "num_leaves": trial.suggest_int("num_leaves", 15, 127),
        "min_child_samples": trial.suggest_int("min_child_samples", 5, 100),
        "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
        "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
    }
    model = lgb.LGBMRegressor(**params, verbose=-1)
    model.fit(X_train, y_train, eval_set=[(X_val, y_val)],
              callbacks=[lgb.early_stopping(50)])
    return model.best_score_["valid_0"]["l2"]
study = optuna.create_study(direction="minimize")
study.optimize(objective, n_trials=100)`,
    source: "pre-seeded",
  },
  {
    category: "tuning",
    problemType: "deep-learning",
    technique: "learning-rate-scheduling",
    whenToUse: "Training neural networks — reduce LR when loss plateaus or use cosine annealing",
    gotchas: "ReduceLROnPlateau needs patience tuning. Cosine annealing works well with warm restarts.",
    codeTemplate: `from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-2)
scheduler = CosineAnnealingWarmRestarts(optimizer, T_0=10, T_mult=2)`,
    source: "pre-seeded",
  },
  {
    category: "tuning",
    problemType: "tabular",
    technique: "early-stopping",
    whenToUse: "Always use with iterative models (GBDT, neural nets) to prevent overfitting",
    gotchas: "Monitor validation metric, not training. Typical patience: 50 rounds for GBDT, 5-10 epochs for NNs.",
    codeTemplate: `# LightGBM
callbacks=[lgb.early_stopping(50), lgb.log_evaluation(100)]
# PyTorch — manual
if val_loss < best_loss:
    best_loss = val_loss
    patience_counter = 0
    torch.save(model.state_dict(), "best_model.pt")
else:
    patience_counter += 1
    if patience_counter >= patience:
        break`,
    source: "pre-seeded",
  },

  // Preprocessing
  {
    category: "preprocessing",
    problemType: "tabular",
    technique: "robust-scaling",
    whenToUse: "When data has outliers that would distort StandardScaler. Uses median and IQR.",
    gotchas: "Fit on training data only. Transform validation/test separately.",
    codeTemplate: `from sklearn.preprocessing import RobustScaler
scaler = RobustScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_val_scaled = scaler.transform(X_val)`,
    source: "pre-seeded",
  },
  {
    category: "preprocessing",
    problemType: "tabular",
    technique: "missing-value-strategies",
    whenToUse: "Handling missing data — LightGBM handles NaN natively, but other models need imputation",
    gotchas: "Never impute with global stats before splitting. For GBDT, leave NaN as-is. For NNs, impute + add indicator column.",
    codeTemplate: `# For non-tree models: impute + indicator
df = df.with_columns(
    pl.col("feature").is_null().cast(pl.Int8).alias("feature_missing"),
    pl.col("feature").fill_null(pl.col("feature").median()).alias("feature_imputed"),
)
# For LightGBM: leave NaN, it handles it natively`,
    source: "pre-seeded",
  },
  {
    category: "preprocessing",
    problemType: "tabular",
    technique: "outlier-detection",
    whenToUse: "Before training, check for extreme values that could dominate model learning",
    gotchas: "Don't remove outliers blindly — they may be real signal. Clip or Winsorize instead of removing.",
    codeTemplate: `# Winsorize at 1st and 99th percentiles
q_low = df["feature"].quantile(0.01)
q_high = df["feature"].quantile(0.99)
df = df.with_columns(
    pl.col("feature").clip(q_low, q_high).alias("feature_clipped")
)`,
    source: "pre-seeded",
  },

  // Evaluation
  {
    category: "evaluation",
    problemType: "tabular-classification",
    technique: "stratified-cv",
    whenToUse: "Classification with imbalanced classes — ensures each fold has representative class distribution",
    gotchas: "Use GroupKFold if data has groups (e.g. patients, users). Use TimeSeriesSplit for temporal data.",
    codeTemplate: `from sklearn.model_selection import StratifiedKFold
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
    X_train, X_val = X[train_idx], X[val_idx]
    y_train, y_val = y[train_idx], y[val_idx]`,
    source: "pre-seeded",
  },
  {
    category: "evaluation",
    problemType: "tabular",
    technique: "metric-selection",
    whenToUse: "Choosing the right evaluation metric based on problem type and business requirements",
    gotchas: "Accuracy is misleading for imbalanced data. RMSE penalizes large errors more than MAE. AUC ignores threshold.",
    codeTemplate: `# Regression: RMSE (penalize large errors), MAE (robust), R² (explained variance)
# Binary classification: AUC-ROC (threshold-free), F1 (balanced), Precision/Recall (asymmetric costs)
# Multiclass: Log loss (probabilistic), Macro F1 (equal weight), Weighted F1 (by support)
from sklearn.metrics import root_mean_squared_error, roc_auc_score, f1_score`,
    source: "pre-seeded",
  },
  {
    category: "evaluation",
    problemType: "tabular",
    technique: "statistical-significance",
    whenToUse: "Before concluding one model is better — check if the improvement is statistically significant",
    gotchas: "Small test sets can show random improvement. Use paired tests (McNemar for classification, Wilcoxon for regression).",
    codeTemplate: `# Use built-in statistical_test tool:
# statistical_test({ test: "mcnemar", predictions_a: [...], predictions_b: [...], labels: [...] })
# Or manually:
from scipy.stats import wilcoxon
stat, p_value = wilcoxon(errors_model_a, errors_model_b)
print(f"p-value: {p_value:.4f} — {'significant' if p_value < 0.05 else 'not significant'}")`,
    source: "pre-seeded",
  },

  // Data Quality
  {
    category: "data-quality",
    problemType: "tabular-classification",
    technique: "class-imbalance-handling",
    whenToUse: "When minority class is <20% of the data and model biases toward majority",
    gotchas: "Try class_weight/is_unbalance first. SMOTE can create unrealistic samples. Undersampling loses data.",
    codeTemplate: `# Option 1: Model-level (preferred)
model = lgb.LGBMClassifier(is_unbalance=True)
# Option 2: Threshold tuning
from sklearn.metrics import precision_recall_curve
precisions, recalls, thresholds = precision_recall_curve(y_val, y_proba)
# Option 3: SMOTE (if needed)
from imblearn.over_sampling import SMOTE
X_resampled, y_resampled = SMOTE(random_state=42).fit_resample(X_train, y_train)`,
    source: "pre-seeded",
  },
  {
    category: "data-quality",
    problemType: "tabular",
    technique: "duplicate-detection",
    whenToUse: "Before splitting data — duplicates across train/test cause leakage",
    gotchas: "Check both exact duplicates and near-duplicates (same features, different target = labeling error).",
    codeTemplate: `# Exact duplicates
n_dupes = df.unique().shape[0] - df.shape[0]
# Near-duplicates (same features, different target)
feature_cols = [c for c in df.columns if c != target_col]
df_deduped = df.unique(subset=feature_cols)
conflicting = df.shape[0] - df_deduped.shape[0]`,
    source: "pre-seeded",
  },
  {
    category: "data-quality",
    problemType: "tabular",
    technique: "feature-importance-analysis",
    whenToUse: "After initial model — understand which features drive predictions, prune noise features",
    gotchas: "LightGBM gain importance can be misleading for high-cardinality features. Use SHAP for reliable importance.",
    codeTemplate: `import shap
explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_val)
shap.summary_plot(shap_values, X_val, plot_type="bar")
# Or quick LightGBM importance
importance = model.feature_importances_
feature_imp = sorted(zip(feature_names, importance), key=lambda x: -x[1])`,
    source: "pre-seeded",
  },
]

export async function seedPatterns(store: KnowledgeStore): Promise<number> {
  const existing = await store.getAllPatterns()
  if (existing.length > 0) return 0

  let count = 0
  for (const pattern of SEED_PATTERNS) {
    const id = `pat-${String(count + 1).padStart(3, "0")}`
    await store.addPattern({ id, ...pattern })
    count++
  }
  return count
}
