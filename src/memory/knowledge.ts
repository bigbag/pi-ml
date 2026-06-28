import { join } from "node:path"
import { JsonlStore } from "./jsonl.js"
import type { PatternRecord, LearningRecord } from "../types/knowledge.js"

export interface PatternFilter {
  category?: string
  problemType?: string
  source?: PatternRecord["source"]
}

export class KnowledgeStore {
  private patterns: JsonlStore<PatternRecord>
  private learnings: JsonlStore<LearningRecord>

  constructor(baseDir: string) {
    this.patterns = new JsonlStore(join(baseDir, "patterns.jsonl"))
    this.learnings = new JsonlStore(join(baseDir, "learnings.jsonl"))
  }

  async addPattern(record: PatternRecord): Promise<void> {
    await this.patterns.append(record)
  }

  async searchPatterns(filter: PatternFilter): Promise<PatternRecord[]> {
    return this.patterns.filter(r => {
      if (filter.category && r.category !== filter.category) return false
      if (filter.problemType && r.problemType !== filter.problemType) return false
      if (filter.source && r.source !== filter.source) return false
      return true
    })
  }

  async getPatternsByProblemType(problemType: string): Promise<PatternRecord[]> {
    return this.searchPatterns({ problemType })
  }

  async addLearning(record: LearningRecord): Promise<void> {
    await this.learnings.append(record)
  }

  async searchLearnings(tags: string[]): Promise<LearningRecord[]> {
    return this.learnings.filter(r =>
      tags.some(t => r.tags.includes(t)),
    )
  }

  async getAllLearnings(): Promise<LearningRecord[]> {
    return this.learnings.readAll()
  }

  async getAllPatterns(): Promise<PatternRecord[]> {
    return this.patterns.readAll()
  }
}
