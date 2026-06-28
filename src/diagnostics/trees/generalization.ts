import type { DiagnosticTree } from "./types.js"

export const generalizationTree: DiagnosticTree = {
  failureType: "generalization",
  triggerCondition: "Validation metric is acceptable but test/production metric is poor",
  nodes: [
    {
      check: "Does the validation strategy match the test distribution?",
      indicators: [
        "Random split used on non-IID data",
        "Validation set drawn from same time period as training",
        "Test set has different feature distributions than validation",
      ],
      suggestions: [
        "Use time-based or group-based validation splits",
        "Check distribution alignment between val and test sets",
        "Use adversarial validation to detect distribution shift",
      ],
    },
    {
      check: "Is there distribution shift between val and test?",
      indicators: [
        "Feature distributions differ between val and test (KS test)",
        "Class proportions changed",
        "New categories or values appear in test data",
      ],
      suggestions: [
        "Train on more diverse data or recent data",
        "Apply domain adaptation techniques",
        "Build features robust to distribution shift",
      ],
    },
    {
      check: "Has the model been over-tuned to the validation set?",
      indicators: [
        "Many hyperparameter tuning iterations on same validation set",
        "Validation metric improved over many rounds of tuning",
        "Gap between CV score and holdout test score",
      ],
      suggestions: [
        "Use nested cross-validation for hyperparameter tuning",
        "Reserve a truly unseen holdout set",
        "Limit hyperparameter search iterations",
      ],
    },
  ],
}
