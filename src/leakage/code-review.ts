export const LEAKAGE_REVIEW_PROMPT = `Review this ML experiment code for potential data leakage. Check each category and report findings.

## Categories to Check

### 1. Preprocessing Leakage
- Is fit_transform() or fit() called on the full dataset before train/test split?
- Is StandardScaler, MinMaxScaler, or any encoder fitted on all data?
- Is imputation using global statistics (mean, median) calculated before splitting?
- Is feature selection (mutual info, RFE, etc.) done before splitting?

### 2. Feature Leakage
- Are any features derived from the target variable?
- Are there features that would not be available at inference time?
- Are there proxy features with suspiciously high correlation to the target?

### 3. Temporal Leakage
- If data has a time component, is future information used in features?
- Are lag features computed correctly without looking ahead?
- Is the split respecting temporal ordering?

### 4. Split Leakage
- Can the same entity (user, transaction, patient) appear in both train and test?
- Is random splitting used on grouped or sequential data?

## Output Format

For each finding:
- **Category**: which leakage type
- **Severity**: error (definite leak) | warning (likely leak) | info (worth checking)
- **Location**: line number or code snippet
- **Issue**: what the problem is
- **Fix**: how to fix it
`
