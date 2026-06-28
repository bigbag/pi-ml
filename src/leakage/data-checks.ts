export interface GeneratedCheck {
  script: string
  description: string
}

export function generateDuplicateCheck(trainPath: string, testPath: string): GeneratedCheck {
  return {
    description: "Check for duplicate/overlapping rows between train and test sets",
    script: `import polars as pl

train = pl.read_csv("${trainPath}")
test = pl.read_csv("${testPath}")

common = train.join(test, on=train.columns, how="inner")
n_overlap = len(common)
print(f"Overlapping rows: {n_overlap} / {len(test)} test rows ({n_overlap/len(test)*100:.1f}%)")
if n_overlap > 0:
    print("WARNING: Train-test contamination detected!")
    print(common.head(5))
`,
  }
}

export function generateGroupLeakageCheck(dataPath: string, groupCol: string, splitCol: string): GeneratedCheck {
  return {
    description: `Check for group leakage on column '${groupCol}' across '${splitCol}' split`,
    script: `import polars as pl

df = pl.read_csv("${dataPath}")
groups_by_split = df.group_by("${splitCol}").agg(pl.col("${groupCol}").unique().alias("groups"))
splits = groups_by_split["${splitCol}"].to_list()
group_sets = [set(g.to_list()) for g in groups_by_split["groups"]]

if len(group_sets) >= 2:
    overlap = group_sets[0] & group_sets[1]
    print(f"Groups in split '{splits[0]}': {len(group_sets[0])}")
    print(f"Groups in split '{splits[1]}': {len(group_sets[1])}")
    print(f"Overlapping groups: {len(overlap)}")
    if overlap:
        print(f"WARNING: Group leakage detected! Overlapping: {list(overlap)[:10]}")
`,
  }
}

export function generateTemporalCheck(dataPath: string, timeCol: string, splitCol: string): GeneratedCheck {
  return {
    description: `Check for temporal leakage on column '${timeCol}'`,
    script: `import polars as pl

df = pl.read_csv("${dataPath}")
df = df.with_columns(pl.col("${timeCol}").cast(pl.Datetime))

for split_val in df["${splitCol}"].unique().to_list():
    subset = df.filter(pl.col("${splitCol}") == split_val)
    print(f"Split '{split_val}': {subset['${timeCol}'].min()} to {subset['${timeCol}'].max()}")

train = df.filter(pl.col("${splitCol}") == "train")
test = df.filter(pl.col("${splitCol}") == "test")
if train["${timeCol}"].max() > test["${timeCol}"].min():
    print("WARNING: Temporal leakage - training data extends past test data start!")
`,
  }
}

export function generateCorrelationCheck(dataPath: string, targetCol: string, threshold: number = 0.95): GeneratedCheck {
  return {
    description: `Check for suspiciously high feature-target correlations (> ${threshold})`,
    script: `import polars as pl

df = pl.read_csv("${dataPath}")
numeric_cols = [c for c in df.columns if df[c].dtype in [pl.Float64, pl.Float32, pl.Int64, pl.Int32] and c != "${targetCol}"]

target = df["${targetCol}"].to_numpy()
suspicious = []
for col in numeric_cols:
    try:
        corr = abs(df[col].pearson_corr(df["${targetCol}"]))
        if corr > ${threshold}:
            suspicious.append((col, corr))
    except Exception:
        pass

if suspicious:
    print(f"WARNING: {len(suspicious)} features with correlation > ${threshold} to target:")
    for col, corr in sorted(suspicious, key=lambda x: -x[1]):
        print(f"  {col}: {corr:.4f}")
else:
    print(f"No features with correlation > ${threshold} to target.")
`,
  }
}
