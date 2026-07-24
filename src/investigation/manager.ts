import { createHash } from "node:crypto"
import { join } from "node:path"
import { JsonlStore } from "../memory/jsonl.js"
import type { Journal } from "../memory/journal.js"
import type { ExperimentStore } from "../store/experiment-store.js"
import type { ExperimentJournalRecord } from "../types/journal.js"
import type {
  InvestigationMetadata,
  Investigation,
  Question,
  LoopState,
} from "../types/investigation.js"

const STALE_MS = 7 * 24 * 60 * 60 * 1000

export class InvestigationManager {
  private store: JsonlStore<InvestigationMetadata>
  private journal: Journal
  private experimentStore?: ExperimentStore

  constructor(baseDir: string, journal: Journal, experimentStore?: ExperimentStore) {
    this.store = new JsonlStore(join(baseDir, "investigations.jsonl"))
    this.journal = journal
    this.experimentStore = experimentStore
  }

  setExperimentStore(store: ExperimentStore): void {
    this.experimentStore = store
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

  private storeToJournal(
    invId: string,
    e: {
      id: string
      name?: string
      status?: string
      hypothesisId?: string
      hyperparameters?: Record<string, unknown>
      results?: Record<string, unknown>
      createdAt?: number
      startedAt?: number
      completedAt?: number
    },
  ): ExperimentJournalRecord {
    const metrics: Record<string, number> = {}
    for (const [k, v] of Object.entries(e.results ?? {})) {
      if (typeof v === "number" && Number.isFinite(v)) metrics[k] = v
    }
    const duration =
      e.startedAt && e.completedAt ? Math.max(0, (e.completedAt - e.startedAt) / 1000) : undefined
    return {
      id: e.id,
      investigationId: invId,
      hypothesisId: e.hypothesisId,
      timestamp: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
      name: e.name,
      status: e.status,
      config: {
        model: String((e.hyperparameters as any)?.model ?? "unknown"),
        features: [],
        params: e.hyperparameters ?? {},
      },
      metrics,
      duration,
      outcome: "unknown",
      hyperparameters: e.hyperparameters,
      results: e.results,
    }
  }

  async load(id: string): Promise<Investigation> {
    const metadata = await this.store.find((r) => r.id === id)
    if (!metadata) throw new Error(`Investigation ${id} not found`)

    const [hypotheses, journalExps, findings] = await Promise.all([
      this.journal.getHypotheses({ investigationId: id }),
      this.journal.getExperiments({ investigationId: id }),
      this.journal.getFindings({ investigationId: id }),
    ])

    // Merge ExperimentStore (source of truth for status/results) with journal
    const byId = new Map<string, ExperimentJournalRecord>()
    for (const e of journalExps) byId.set(e.id, e)

    if (this.experimentStore) {
      const storeExps = await this.experimentStore.list({ investigationId: id })
      // Also include unscoped store exps that appear in journal for this inv
      const allStore = storeExps.length
        ? storeExps
        : (await this.experimentStore.list()).filter((e) => byId.has(e.id) || e.investigationId === id)

      for (const e of allStore) {
        const mapped = this.storeToJournal(id, e)
        const prev = byId.get(e.id)
        byId.set(e.id, prev ? { ...prev, ...mapped, metrics: { ...prev.metrics, ...mapped.metrics } } : mapped)
      }
    }

    return {
      ...metadata,
      hypotheses,
      experiments: [...byId.values()],
      findings,
    }
  }

  async list(): Promise<InvestigationMetadata[]> {
    return this.store.readAll()
  }

  async findByIdOrGoal(query: string): Promise<InvestigationMetadata | undefined> {
    const all = await this.list()
    const exact = all.find((i) => i.id === query)
    if (exact) return exact
    const q = query.toLowerCase()
    return (
      all.find((i) => i.goal.toLowerCase().includes(q)) ??
      all.find((i) => i.id.toLowerCase().includes(q))
    )
  }

  listStale(actives: InvestigationMetadata[], now = Date.now()): InvestigationMetadata[] {
    return actives.filter((i) => {
      const t = Date.parse(i.lastActivity)
      return Number.isFinite(t) && now - t > STALE_MS
    })
  }

  async pause(id: string): Promise<void> {
    await this.store.update((r) => r.id === id, {
      status: "paused",
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async resume(id: string): Promise<void> {
    const hit = await this.findByIdOrGoal(id)
    if (!hit) {
      const all = await this.list()
      throw new Error(
        `Investigation not found: ${id}. Known: ${all.map((i) => i.id).join(", ") || "(none)"}`,
      )
    }
    await this.store.update((r) => r.id === hit.id, {
      status: "active",
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async close(id: string): Promise<void> {
    await this.store.update((r) => r.id === id, {
      status: "closed",
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async updateContext(
    id: string,
    patch: Partial<Pick<InvestigationMetadata, "currentBest" | "notes" | "constraints" | "loop">>,
  ): Promise<void> {
    await this.store.update((r) => r.id === id, {
      ...patch,
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  async setLoopState(id: string, loop: LoopState | undefined): Promise<void> {
    await this.updateContext(id, { loop })
  }

  async getActiveId(): Promise<string | undefined> {
    const all = await this.list()
    return all.find((i) => i.status === "active")?.id
  }

  async addQuestion(id: string, question: Question): Promise<void> {
    const metadata = await this.store.find((r) => r.id === id)
    if (!metadata) throw new Error(`Investigation ${id} not found`)
    const questions = [...metadata.openQuestions, question]
    await this.store.update((r) => r.id === id, {
      openQuestions: questions,
      lastActivity: new Date().toISOString(),
    } as Partial<InvestigationMetadata>)
  }

  /** Pause all currently active investigations (e.g. session end hygiene). */
  async pauseAllActive(note?: string): Promise<string[]> {
    const all = await this.list()
    const actives = all.filter((i) => i.status === "active")
    for (const a of actives) {
      const notes = note ? [...(a.notes ?? []), note] : a.notes
      await this.store.update((r) => r.id === a.id, {
        status: "paused",
        lastActivity: new Date().toISOString(),
        notes,
      } as Partial<InvestigationMetadata>)
    }
    return actives.map((a) => a.id)
  }
}
