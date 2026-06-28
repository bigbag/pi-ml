import type { DiagnosticTree } from "./types.js"

export const overfittingTree: DiagnosticTree = {
  failureType: "overfitting",
  triggerCondition: "Training metric significantly better than validation metric",
  nodes: [
    {
      check: "Is the model too complex for the data size?",
      indicators: [
        "High parameter count relative to sample count",
        "Deep trees or many layers",
        "Large number of features relative to observations",
      ],
      suggestions: [
        "Reduce model complexity (fewer layers, shallower trees)",
        "Use simpler model as baseline",
        "Add more training data",
        "Apply feature selection to reduce dimensionality",
      ],
    },
    {
      check: "Is regularization applied?",
      indicators: [
        "No L1/L2 penalty configured",
        "No dropout layers in neural network",
        "No early stopping enabled",
        "No min_child_samples or min_data_in_leaf constraint",
      ],
      suggestions: [
        "Add L2 regularization (reg_lambda for LightGBM)",
        "Enable early stopping with patience",
        "Add dropout for neural networks",
        "Set min_child_samples to prevent overfitting on small leaf nodes",
      ],
    },
    {
      check: "Is there data leakage inflating training metrics?",
      indicators: [
        "Suspiciously perfect or near-perfect training score",
        "Features with very high correlation to target (>0.95)",
        "Preprocessing fitted on full dataset before split",
      ],
      suggestions: [
        "Run leakage preflight checks",
        "Review feature engineering pipeline for target leakage",
        "Verify preprocessing is fitted on training data only",
      ],
    },
    {
      check: "Is the cross-validation variance high?",
      indicators: [
        "Large standard deviation across CV folds",
        "Some folds perform much better than others",
        "Small dataset with high variance in fold metrics",
      ],
      suggestions: [
        "Use more CV folds for more stable estimates",
        "Try repeated k-fold for better variance estimation",
        "Consider stratified splits if classes are imbalanced",
      ],
    },
  ],
}
