import { join } from "node:path"
import { JsonlStore } from "./jsonl.js"
import type { ExperimentJournalRecord, FindingRecord } from "../types/journal.js"
import type { HypothesisRecord } from "../types/hypothesis.js"

export interface ExperimentFilter {
  investigationId?: string
  hypothesisId?: string
  model?: string
  outcome?: ExperimentJournalRecord["outcome"]
}

export interface HypothesisFilter {
  investigationId?: string
  status?: HypothesisRecord["status"]
}

export interface FindingFilter {
  investigationId?: string
  type?: FindingRecord["type"]
  tags?: string[]
}

export class Journal {
  private experiments: JsonlStore<ExperimentJournalRecord>
  private hypotheses: JsonlStore<HypothesisRecord>
  private findings: JsonlStore<FindingRecord>

  constructor(baseDir: string) {
    this.experiments = new JsonlStore(join(baseDir, "experiments.jsonl"))
    this.hypotheses = new JsonlStore(join(baseDir, "hypotheses.jsonl"))
    this.findings = new JsonlStore(join(baseDir, "findings.jsonl"))
  }

  async recordExperiment(record: ExperimentJournalRecord): Promise<void> {
    await this.experiments.append(record)
  }

  async getExperiments(filter?: ExperimentFilter): Promise<ExperimentJournalRecord[]> {
    if (!filter) return this.experiments.readAll()
    return this.experiments.filter(r => {
      if (filter.investigationId && r.investigationId !== filter.investigationId) return false
      if (filter.hypothesisId && r.hypothesisId !== filter.hypothesisId) return false
      if (filter.model && r.config.model !== filter.model) return false
      if (filter.outcome && r.outcome !== filter.outcome) return false
      return true
    })
  }

  async topExperiments(
    metric: string,
    direction: "asc" | "desc",
    limit: number,
  ): Promise<ExperimentJournalRecord[]> {
    const all = await this.experiments.readAll()
    const withMetric = all.filter(r => metric in r.metrics)
    withMetric.sort((a, b) => {
      const diff = (a.metrics[metric] ?? 0) - (b.metrics[metric] ?? 0)
      return direction === "asc" ? diff : -diff
    })
    return withMetric.slice(0, limit)
  }

  async recordHypothesis(record: HypothesisRecord): Promise<void> {
    await this.hypotheses.append(record)
  }

  async getHypotheses(filter?: HypothesisFilter): Promise<HypothesisRecord[]> {
    if (!filter) return this.hypotheses.readAll()
    return this.hypotheses.filter(r => {
      if (filter.investigationId && r.investigationId !== filter.investigationId) return false
      if (filter.status && r.status !== filter.status) return false
      return true
    })
  }

  async updateHypothesis(id: string, patch: Partial<HypothesisRecord>): Promise<void> {
    await this.hypotheses.update(r => r.id === id, patch)
  }

  async recordFinding(record: FindingRecord): Promise<void> {
    await this.findings.append(record)
  }

  async getFindings(filter?: FindingFilter): Promise<FindingRecord[]> {
    if (!filter) return this.findings.readAll()
    return this.findings.filter(r => {
      if (filter.investigationId && r.investigationId !== filter.investigationId) return false
      if (filter.type && r.type !== filter.type) return false
      if (filter.tags && !filter.tags.some(t => r.tags.includes(t))) return false
      return true
    })
  }
}
