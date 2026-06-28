import { createHash } from "node:crypto"
import { join } from "node:path"
import { JsonlStore } from "../memory/jsonl.js"
import type { Journal } from "../memory/journal.js"
import type {
  InvestigationMetadata,
  Investigation,
  Question,
} from "../types/investigation.js"

export class InvestigationManager {
  private store: JsonlStore<InvestigationMetadata>
  private journal: Journal

  constructor(baseDir: string, journal: Journal) {
    this.store = new JsonlStore(join(baseDir, "investigations.jsonl"))
    this.journal = journal
  }

  async create(
    goal: string,
    dataset: string,
    problemType: string,
    constraints?: string[],
  ): Promise<string> {
    const now = new Date().toISOString()
    const id = "inv-" + createHash("sha256").update(goal + now).digest("hex").slice(0, 8)
    const metadata: InvestigationMetadata = {
      id,
      goal,
      status: "active",
      created: now,
      lastActivity: now,
      dataset,
      problemType,
      currentBest: null,
      constraints: constraints ?? [],
      notes: [],
      openQuestions: [],
    }
    await this.store.append(metadata)
    return id
  }

  async load(id: string): Promise<Investigation> {
    const metadata = await this.store.find(r => r.id === id)
    if (!metadata) throw new Error(`Investigation ${id} not found`)

    const [hypotheses, experiments, findings] = await Promise.all([
      this.journal.getHypotheses({ investigationId: id }),
      this.journal.getExperiments({ investigationId: id }),
      this.journal.getFindings({ investigationId: id }),
    ])

    return { ...metadata, hypotheses, experiments, findings }
  }

  async list(): Promise<InvestigationMetadata[]> {
    return this.store.readAll()
  }

  async pause(id: string): Promise<void> {
    await this.store.update(r => r.id === id, {
      status: "paused",
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async resume(id: string): Promise<void> {
    await this.store.update(r => r.id === id, {
      status: "active",
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async close(id: string): Promise<void> {
    await this.store.update(r => r.id === id, {
      status: "closed",
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async updateContext(
    id: string,
    patch: Partial<Pick<InvestigationMetadata, "currentBest" | "notes" | "constraints">>,
  ): Promise<void> {
    await this.store.update(r => r.id === id, {
      ...patch,
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async addQuestion(id: string, question: Question): Promise<void> {
    const metadata = await this.store.find(r => r.id === id)
    if (!metadata) throw new Error(`Investigation ${id} not found`)
    const questions = [...metadata.openQuestions, question]
    await this.store.update(r => r.id === id, {
      openQuestions: questions,
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }
}
