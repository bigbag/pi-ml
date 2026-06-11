/**
 * Custom rendering for ML tool calls and results.
 * 
 * This module provides themed rendering for pi-ml tool executions.
 * Uses pi-tui components for consistent theming with the rest of pi.
 */

import { Text } from "@earendil-works/pi-tui";
import type { Theme } from "@earendil-works/pi-coding-agent";

export function renderExperimentStatus(status: string, theme: Theme): string {
  const colors: Record<string, string> = {
    planned: theme.fg("dim", "○ planned"),
    running: theme.fg("warning", "◐ running"),
    completed: theme.fg("success", "✓ completed"),
    failed: theme.fg("error", "✗ failed"),
    aborted: theme.fg("error", "⊘ aborted"),
  };
  return colors[status] || status;
}

export function renderArtifactBadge(type: string, theme: Theme): string {
  const icons: Record<string, string> = {
    model: "🧠",
    checkpoint: "💾",
    log: "📋",
    config: "⚙️",
    prediction: "📊",
    plot: "📈",
    dataset: "🗃️",
    report: "📝",
    code: "💻",
  };
  return `${icons[type] || "📄"} ${theme.fg("accent", type)}`;
}
