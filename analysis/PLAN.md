# Plans

Full implementation plan (from session analysis):

- [2026-07-24-pi-ml-reliability.md](../2026-07-24-pi-ml-reliability.md)

Evidence:

- DEEP_FINDINGS_V2.md
- FINDINGS_AND_RECOMMENDATIONS.md
- DEEP_ANALYSIS.md

## Implementation status (2026-07-24)

### Done (Tier 0 + most Tier 1/2)
- Unique IDs (`src/util/ids.ts`)
- File lock + JSONL corrupt-line skip
- ExperimentStore upsert/lock/getOrCreate + investigationId
- Dual-write journal + investigation.load merges store
- Shell-capable LocalRunner + log streaming to `.cache/ml-agent/tmp`
- Finding/learning unique IDs + active-inv defaults + truncate
- Doom-loop + name-streak wired on `tool_call`
- Honest leak_preflight prompt + optional `requireLeakPreflight`
- Real `/ml-loop` state on investigation + stop conditions
- Schema: optional experimentId on list; tolerant diagnose metrics
- Path standardization `.cache/ml-agent`
- Skill `cv_split` → `cv_manager`
- Stale inv detection, fuzzy resume, session_end auto-pause
- `submission_check` tool
- Post-run stop-pod reminder
- Hypothesis ↔ experiment linkage
- Repair script `scripts/repair-experiments-jsonl.mjs`

### Still open / lighter touch
- Full RunPod SSH runner (reminders only)
- Kaggle MCP flat facade
- dataset_profile parquet/dir skip path (skill guidance only)
- Re-measure live sessions with analysis scripts
