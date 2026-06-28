import type { DiagnosticTree } from "./types.js"

export const imbalanceTree: DiagnosticTree = {
  failureType: "imbalance",
  triggerCondition: "High accuracy but poor recall/precision on minority class",
  nodes: [
    {
      check: "How imbalanced is the class distribution?",
      indicators: [
        "Minority class is less than 10% of data",
        "Extreme ratio (100:1 or worse)",
        "Model predicts majority class almost exclusively",
      ],
      suggestions: [
        "Check class distribution with value_counts()",
        "Quantify imbalance ratio",
        "Consider whether resampling or reweighting is needed",
      ],
    },
    {
      check: "Is the evaluation metric appropriate?",
      indicators: [
        "Using accuracy as primary metric on imbalanced data",
        "Model achieves high accuracy by predicting majority class",
        "Confusion matrix shows near-zero minority predictions",
      ],
      suggestions: [
        "Switch to F1, precision-recall AUC, or balanced accuracy",
        "Use class-specific metrics (per-class recall/precision)",
        "Plot precision-recall curve instead of ROC for severe imbalance",
      ],
    },
    {
      check: "Is sampling strategy appropriate?",
      indicators: [
        "No oversampling or undersampling applied",
        "SMOTE used without evaluating impact",
        "Resampling applied before cross-validation split",
      ],
      suggestions: [
        "Try class weights in the model (scale_pos_weight for LightGBM)",
        "Apply SMOTE or random oversampling inside CV folds only",
        "Try random undersampling of majority class",
        "Consider focal loss for neural networks",
      ],
    },
  ],
}
