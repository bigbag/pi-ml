#!/usr/bin/env node
/**
 * Repair corrupt experiments.jsonl by keeping only valid JSON object lines.
 * Usage: node scripts/repair-experiments-jsonl.mjs <path-to-experiments.jsonl>
 */
import { readFile, writeFile, copyFile } from "node:fs/promises"
import { resolve } from "node:path"

const file = process.argv[2]
if (!file) {
  console.error("Usage: node scripts/repair-experiments-jsonl.mjs <experiments.jsonl>")
  process.exit(1)
}

const path = resolve(file)
const raw = await readFile(path, "utf-8")
const lines = raw.split("\n")
const good = []
let skipped = 0
for (const line of lines) {
  if (!line.trim()) continue
  try {
    const obj = JSON.parse(line)
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      good.push(JSON.stringify(obj))
    } else {
      skipped++
    }
  } catch {
    skipped++
  }
}

const bak = path + ".bak"
await copyFile(path, bak)
await writeFile(path, good.length ? good.join("\n") + "\n" : "")
console.log(`Repaired ${path}: kept ${good.length}, skipped ${skipped}, backup ${bak}`)
