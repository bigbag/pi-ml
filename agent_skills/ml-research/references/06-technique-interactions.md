# Technique Interaction Mapping

Techniques don't add up linearly. Two methods that each gain +0.01 might yield +0.015 together (diminishing) or +0.025 (synergy) or -0.005 (destructive interference). Map interactions before combining.

## Interaction Matrix

Before combining N techniques, build an NxN interaction matrix:

```
            | Quantization | Pruning | Distillation | Data Aug |
Quantization|     —        | ⚠️ CONFLICT | ✅ SYNERGY  | ➡️ NEUTRAL |
Pruning     | ⚠️ CONFLICT  |    —        | ✅ SYNERGY  | ➡️ NEUTRAL |
Distillation| ✅ SYNERGY   | ✅ SYNERGY  |     —       | ✅ SYNERGY |
Data Aug    | ➡️ NEUTRAL   | ➡️ NEUTRAL  | ✅ SYNERGY  |     —      |
```

### Categories

| Symbol | Interaction | Implication |
|--------|-------------|-------------|
| ✅ SYNERGY | Combined effect > sum of parts | Apply together, measure joint delta |
| ➡️ NEUTRAL | Combined ≈ sum of parts | Safe to apply independently |
| ⚠️ CONFLICT | Combined < sum, or one cancels other | Test order matters; may need to choose one |
| ❌ DESTRUCTIVE | Combined worse than either alone | Never combine without evidence |

## Known Interaction Patterns

### Synergies (combine these)
- **Distillation + Quantization**: Teacher provides soft targets that survive quantization better than hard labels
- **Data augmentation + Regularization**: Augmentation provides implicit regularization; explicit regularization prevents memorizing augmented patterns
- **Architecture search + Training recipe tuning**: Better architecture changes the optimal LR/schedule landscape
- **Mixed precision + Gradient checkpointing**: Both save memory, enabling larger effective batch size

### Conflicts (be careful)
- **Aggressive pruning + Aggressive quantization**: Both remove capacity; combined effect is often catastrophic
- **Dropout + Batch normalization**: BN statistics shift between train/eval; dropout changes the distribution BN sees
- **Multiple regularizers at high strength**: L2 + dropout + weight decay can over-regularize, making the model underfit
- **Knowledge distillation + Label smoothing**: Both soften targets; double-softening may lose signal

### Order-dependent
- **Quantization-Aware Training (QAT) before vs after pruning**: QAT then prune often works; prune then QAT requires careful calibration
- **Feature engineering before vs after architecture choice**: Tree models need different features than neural nets; decide architecture first

## How to Test Interactions

1. **Baseline**: run each technique independently, measure delta
2. **Pair test**: combine the top 2 techniques, measure joint delta
3. **Compare**: joint delta vs sum of individual deltas
   - If joint > 0.8 × sum: safe to combine (synergy or neutral)
   - If joint < 0.5 × sum: conflict — investigate
   - If joint < 0: destructive — do not combine

## Interaction-Aware Experiment Planning

When planning N experiments involving K techniques:

1. Run each technique independently first (K experiments)
2. Build the interaction matrix from known patterns + domain knowledge
3. For SYNERGY pairs: test the combination (1 experiment per pair)
4. For CONFLICT pairs: choose the stronger technique, skip the combination
5. For NEUTRAL pairs: assume additive, skip the combination test (save budget)
6. Final experiment: combine all surviving techniques

This costs K + number_of_synergy_pairs + 1 experiments, not 2^K.
