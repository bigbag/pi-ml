import type { DiagnosticTree } from "./types.js"

export const instabilityTree: DiagnosticTree = {
  failureType: "instability",
  triggerCondition: "Loss is NaN, exploding, or oscillating wildly during training",
  nodes: [
    {
      check: "Is the learning rate too high?",
      indicators: [
        "Loss increases rapidly after first few steps",
        "Loss oscillates without converging",
        "Gradient norms are very large",
      ],
      suggestions: [
        "Reduce learning rate by 10x",
        "Use learning rate warmup",
        "Try learning rate finder to identify stable range",
      ],
    },
    {
      check: "Are inputs properly scaled?",
      indicators: [
        "Features have very different scales (some in 0-1, others in thousands)",
        "No normalization or standardization applied",
        "Extreme outliers in input data",
      ],
      suggestions: [
        "Apply StandardScaler or RobustScaler to features",
        "Clip or remove extreme outliers",
        "Use batch normalization in neural networks",
      ],
    },
    {
      check: "Is gradient clipping enabled?",
      indicators: [
        "Gradient norms spike to very large values",
        "Loss suddenly jumps to NaN or inf",
        "Model weights contain NaN values",
      ],
      suggestions: [
        "Enable gradient clipping (max_norm=1.0)",
        "Use gradient scaling for mixed precision training",
        "Check for inf/NaN in input data",
      ],
    },
    {
      check: "Is the batch size appropriate?",
      indicators: [
        "Very small batch size causing noisy gradients",
        "Very large batch size with default learning rate",
        "Batch size changed without adjusting learning rate",
      ],
      suggestions: [
        "Scale learning rate linearly with batch size",
        "Use batch size of 32-256 as starting point",
        "Try gradient accumulation for effective larger batches",
      ],
    },
  ],
}
