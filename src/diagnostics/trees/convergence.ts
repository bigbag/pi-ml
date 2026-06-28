import type { DiagnosticTree } from "./types.js"

export const convergenceTree: DiagnosticTree = {
  failureType: "convergence",
  triggerCondition: "Loss is decreasing but very slowly — training is inefficient",
  nodes: [
    {
      check: "Is the learning rate too low?",
      indicators: [
        "Loss decreases by tiny amounts each epoch",
        "Training would need hundreds of epochs to converge",
        "Learning rate is orders of magnitude below default",
      ],
      suggestions: [
        "Increase learning rate by 3-10x",
        "Use learning rate warmup followed by cosine decay",
        "Try learning rate finder to identify optimal range",
      ],
    },
    {
      check: "Is the optimizer appropriate?",
      indicators: [
        "Using vanilla SGD without momentum",
        "Adam with default parameters on a difficult landscape",
        "Optimizer not matching the problem type",
      ],
      suggestions: [
        "Switch to Adam or AdamW optimizer",
        "Add momentum to SGD (0.9 is a good default)",
        "Try different optimizer (RAdam, Lookahead)",
      ],
    },
    {
      check: "Are features properly scaled?",
      indicators: [
        "Features have very different magnitudes",
        "Gradient updates dominated by large-scale features",
        "Slow convergence only in certain parameter groups",
      ],
      suggestions: [
        "Apply StandardScaler or MinMaxScaler",
        "Use per-feature normalization",
        "Consider using batch normalization layers",
      ],
    },
    {
      check: "Is the batch size causing issues?",
      indicators: [
        "Very large batch size reducing gradient noise",
        "Batch size too large for the dataset",
        "Generalization gap increases with batch size",
      ],
      suggestions: [
        "Try smaller batch sizes (32-128)",
        "If large batch needed, use linear learning rate scaling",
        "Try gradient accumulation with smaller micro-batches",
      ],
    },
  ],
}
