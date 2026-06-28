import type { FailureType } from "../../types/diagnostics.js"
import type { DiagnosticTree } from "./types.js"
import { overfittingTree } from "./overfitting.js"
import { underfittingTree } from "./underfitting.js"
import { instabilityTree } from "./instability.js"
import { generalizationTree } from "./generalization.js"
import { imbalanceTree } from "./imbalance.js"
import { convergenceTree } from "./convergence.js"

export type { DiagnosticNode, DiagnosticTree } from "./types.js"

export const ALL_TREES: DiagnosticTree[] = [
  overfittingTree,
  underfittingTree,
  instabilityTree,
  generalizationTree,
  imbalanceTree,
  convergenceTree,
]

const treeMap = new Map<FailureType, DiagnosticTree>(
  ALL_TREES.map(t => [t.failureType, t]),
)

export function getTree(type: FailureType): DiagnosticTree | undefined {
  return treeMap.get(type)
}
