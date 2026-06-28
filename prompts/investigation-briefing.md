# Investigation Briefing

Present a status briefing for this investigation to help the user decide what to do next.

## Investigation

**Goal:** {{goal}}
**Status:** {{status}}
**Created:** {{created}}
**Last activity:** {{lastActivity}}

## Current Best

{{#currentBest}}
**{{metric}}** = {{value}} (experiment {{experimentId}})
{{/currentBest}}
{{^currentBest}}
No experiments run yet.
{{/currentBest}}

## Hypotheses

| Status | Count | Details |
|--------|-------|---------|
| Pending | {{pendingCount}} | {{#pendingHypotheses}}{{text}}; {{/pendingHypotheses}} |
| Testing | {{testingCount}} | {{#testingHypotheses}}{{text}}; {{/testingHypotheses}} |
| Confirmed | {{confirmedCount}} | {{#confirmedHypotheses}}{{text}} → {{outcome}}; {{/confirmedHypotheses}} |
| Rejected | {{rejectedCount}} | {{#rejectedHypotheses}}{{text}} → {{outcome}}; {{/rejectedHypotheses}} |

## Open Questions

{{#openQuestions}}
- [{{priority}}] {{text}} (added {{addedAt}})
{{/openQuestions}}
{{^openQuestions}}
No open questions.
{{/openQuestions}}

## Recent Findings

{{#recentFindings}}
- **[{{type}}]** {{text}} (from {{sourceExperiments}})
{{/recentFindings}}

## Suggested Next Steps

Based on the current state, suggest 2-3 concrete next actions:
1. The highest-value pending hypothesis to test
2. Any open questions that should be resolved first
3. Whether to continue, pivot, or close

Ask the user: "What would you like to do next?"
