export interface PatternRecord {
  id: string
  category: string
  problemType: string
  technique: string
  whenToUse: string
  gotchas: string
  codeTemplate: string
  source: "pre-seeded" | "learned"
}

export interface LearningRecord {
  id: string
  text: string
  evidence: string[]
  tags: string[]
  source: "learned"
  timestamp: string
}
