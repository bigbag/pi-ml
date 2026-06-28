import type { DiagnosticTree } from "./types.js"

export const underfittingTree: DiagnosticTree = {
  failureType: "underfitting",
  triggerCondition: "Training metric is poor — model fails to learn the pattern",
  nodes: [
    {
      check: "Is the model capacity sufficient?",
      indicators: [
        "Using linear model on non-linear problem",
        "Very shallow trees (max_depth=1 or 2)",
        "Too few estimators or epochs",
      ],
      suggestions: [
        "Try a more expressive model (e.g., gradient boosting instead of linear)",
        "Increase max_depth or n_estimators",
        "Train for more epochs with appropriate learning rate",
      ],
    },
    {
      check: "Are the features informative?",
      indicators: [
        "Low feature importance across all features",
        "High noise-to-signal ratio",
        "Missing key domain-specific features",
      ],
      suggestions: [
        "Engineer new features based on domain knowledge",
        "Check for missing important data sources",
        "Try interaction features or polynomial features",
      ],
    },
    {
      check: "Is the learning rate too high or training too short?",
      indicators: [
        "Loss plateaus very early",
        "Training stopped before convergence",
        "Learning rate is default and may be too aggressive",
      ],
      suggestions: [
        "Reduce learning rate and increase number of iterations",
        "Use learning rate scheduling (cosine, step decay)",
        "Monitor training curves to ensure convergence",
      ],
    },
    {
      check: "Is data quality sufficient?",
      indicators: [
        "High percentage of missing values",
        "Mislabeled target values",
        "Excessive noise in features",
      ],
      suggestions: [
        "Audit data quality — check for mislabeled examples",
        "Improve imputation strategy for missing values",
        "Consider removing highly noisy samples",
      ],
    },
  ],
}
