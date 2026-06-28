# Leakage Code Review

Review this experiment code for data leakage before execution.

## Code to Review

```
{{code}}
```

## Dataset Profile

{{datasetProfile}}

## Checklist

Check each category. For any finding, report the severity (error/warning/info), the specific line or pattern, and the suggested fix.

### 1. Preprocessing Order

- [ ] Is `fit_transform()` or `fit()` called before `train_test_split()`?
- [ ] Is any scaler, encoder, or imputer fit on the full dataset?
- [ ] Is feature selection (mutual info, RFE, etc.) done before splitting?
- [ ] Are any global statistics (mean, std, min, max) computed before splitting?

### 2. Feature Availability at Inference Time

- [ ] Will every feature in the model be available when making predictions?
- [ ] Are any features derived from the target variable (directly or via proxy)?
- [ ] Are any features derived from future events (for time-series data)?
- [ ] Are there any ID-like columns being used as features?

### 3. Split Strategy Validation

- [ ] Is the split strategy appropriate for the data structure?
  - Time-series data → time-based split (not random)
  - Multi-row entities → group split (not random)
  - Imbalanced classes → stratified split
- [ ] Are there duplicate or near-duplicate rows that could span train/test?
- [ ] Is the same entity (user, transaction, etc.) in both train and test?

### 4. Cross-Validation Leakage

- [ ] Is preprocessing inside the CV loop (not before it)?
- [ ] Are group constraints respected across folds?
- [ ] Is the validation strategy consistent with the test set strategy?

### 5. Suspiciously Good Results

- [ ] Is any feature correlated >0.95 with the target?
- [ ] Are training metrics close to perfect (>0.99 accuracy, <0.001 loss)?
- [ ] Is the gap between train and validation metrics unusually small?

## Output Format

For each finding:
- **Severity**: error (blocks experiment) / warning (likely problem) / info (worth checking)
- **Category**: which checklist section
- **Location**: specific line or code pattern
- **Issue**: what's wrong
- **Fix**: how to fix it
