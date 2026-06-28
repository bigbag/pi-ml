import { describe, it, expect } from "vitest"
import { getTree, ALL_TREES } from "../../src/diagnostics/trees/index.js"
import type { DiagnosticNode } from "../../src/diagnostics/trees/types.js"
import type { FailureType } from "../../src/types/diagnostics.js"

const EXPECTED_TYPES: FailureType[] = [
  "overfitting",
  "underfitting",
  "instability",
  "generalization",
  "imbalance",
  "convergence",
]

function validateNode(node: DiagnosticNode): void {
  expect(node.check).toBeTruthy()
  expect(node.indicators.length).toBeGreaterThan(0)
  expect(node.suggestions.length).toBeGreaterThan(0)
  if (node.children) {
    for (const child of node.children) {
      validateNode(child)
    }
  }
}

describe("Diagnostic Trees", () => {
  it("has all six failure type trees", () => {
    expect(ALL_TREES).toHaveLength(6)
    for (const type of EXPECTED_TYPES) {
      const tree = getTree(type)
      expect(tree).toBeDefined()
      expect(tree!.failureType).toBe(type)
    }
  })

  it("returns undefined for unknown failure type", () => {
    expect(getTree("unknown")).toBeUndefined()
  })

  for (const type of EXPECTED_TYPES) {
    describe(`${type} tree`, () => {
      it("has at least 3 top-level nodes", () => {
        const tree = getTree(type)!
        expect(tree.nodes.length).toBeGreaterThanOrEqual(3)
      })

      it("has a non-empty trigger condition", () => {
        const tree = getTree(type)!
        expect(tree.triggerCondition).toBeTruthy()
      })

      it("every node has valid check, indicators, suggestions", () => {
        const tree = getTree(type)!
        for (const node of tree.nodes) {
          validateNode(node)
        }
      })
    })
  }
})
