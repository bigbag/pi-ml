import { Type } from "typebox"
import * as fs from "node:fs/promises"
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const split = (line: string) => {
    // simple CSV split (handles quoted fields lightly)
    const out: string[] = []
    let cur = ""
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = !inQ
        }
      } else if (c === "," && !inQ) {
        out.push(cur)
        cur = ""
      } else {
        cur += c
      }
    }
    out.push(cur)
    return out.map((s) => s.trim())
  }
  const headers = split(lines[0])
  const rows = lines.slice(1).map(split)
  return { headers, rows }
}

function isNumeric(s: string): boolean {
  if (s === "" || s.toLowerCase() === "nan" || s.toLowerCase() === "null") return false
  return !Number.isNaN(Number(s))
}

export function registerSubmissionTools(pi: ExtensionAPI) {
  pi.registerTool({
    name: "submission_check",
    label: "Check Submission",
    description:
      "Validate a competition submission CSV against sample_submission (rows, ids, nulls, dtypes)",
    promptSnippet: "Validate submission format before upload",
    parameters: Type.Object({
      submissionPath: Type.String(),
      samplePath: Type.Optional(Type.String()),
      idColumn: Type.Optional(Type.String()),
      valueColumns: Type.Optional(Type.Array(Type.String())),
      expectRows: Type.Optional(Type.Number()),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const issues: string[] = []
      let ok = true

      let subRaw: string
      try {
        subRaw = await fs.readFile(params.submissionPath, "utf-8")
      } catch {
        return {
          content: [{ type: "text", text: `FAIL: submission not found: ${params.submissionPath}` }],
          details: { ok: false as boolean, issues: ["missing_submission"] as string[], rows: 0, headers: [] as string[] },
        }
      }

      if (!subRaw.trim()) {
        return {
          content: [{ type: "text", text: "FAIL: submission file is empty" }],
          details: { ok: false as boolean, issues: ["empty_submission"] as string[], rows: 0, headers: [] as string[] },
        }
      }

      const sub = parseCsv(subRaw)
      if (sub.headers.length === 0) {
        issues.push("no header row")
        ok = false
      }

      const idCol = params.idColumn ?? sub.headers[0]
      const idIdx = sub.headers.indexOf(idCol)
      if (idIdx < 0) {
        issues.push(`id column "${idCol}" not in submission headers: ${sub.headers.join(",")}`)
        ok = false
      }

      const valueCols =
        params.valueColumns ??
        sub.headers.filter((h) => h !== idCol)
      const valueIdxs = valueCols.map((c) => sub.headers.indexOf(c))
      for (let i = 0; i < valueCols.length; i++) {
        if (valueIdxs[i] < 0) {
          issues.push(`value column "${valueCols[i]}" missing from submission`)
          ok = false
        }
      }

      let sampleRows = 0
      let sampleIds: Set<string> | undefined
      let sampleNumericCols: Set<string> | undefined

      if (params.samplePath) {
        try {
          const sampleRaw = await fs.readFile(params.samplePath, "utf-8")
          const sample = parseCsv(sampleRaw)
          sampleRows = sample.rows.length
          const sIdIdx = sample.headers.indexOf(idCol)
          if (sIdIdx >= 0) {
            sampleIds = new Set(sample.rows.map((r) => r[sIdIdx]))
          } else {
            issues.push(`id column "${idCol}" not in sample headers`)
            ok = false
          }
          sampleNumericCols = new Set()
          for (const col of valueCols) {
            const idx = sample.headers.indexOf(col)
            if (idx < 0) continue
            const vals = sample.rows.slice(0, 50).map((r) => r[idx]).filter((v) => v !== undefined && v !== "")
            if (vals.length && vals.every(isNumeric)) sampleNumericCols.add(col)
          }

          // header equality soft check
          if (sample.headers.join("|") !== sub.headers.join("|")) {
            issues.push(
              `header mismatch: submission=[${sub.headers.join(",")}] sample=[${sample.headers.join(",")}]`,
            )
            ok = false
          }
        } catch {
          issues.push(`sample not readable: ${params.samplePath}`)
          ok = false
        }
      }

      const expectRows = params.expectRows ?? (sampleRows || undefined)
      if (expectRows !== undefined && sub.rows.length !== expectRows) {
        issues.push(`row count ${sub.rows.length} != expected ${expectRows}`)
        ok = false
      }

      if (idIdx >= 0) {
        const ids = sub.rows.map((r) => r[idIdx])
        const idSet = new Set(ids)
        if (idSet.size !== ids.length) {
          issues.push(`duplicate ids: ${ids.length - idSet.size} duplicates`)
          ok = false
        }
        if (sampleIds) {
          for (const id of sampleIds) {
            if (!idSet.has(id)) {
              issues.push(`missing id from sample: ${id}`)
              ok = false
              break
            }
          }
          for (const id of idSet) {
            if (!sampleIds.has(id)) {
              issues.push(`extra id not in sample: ${id}`)
              ok = false
              break
            }
          }
        }
      }

      let nullCount = 0
      for (const idx of valueIdxs) {
        if (idx < 0) continue
        for (const row of sub.rows) {
          const v = row[idx]
          if (v === undefined || v === "" || v.toLowerCase() === "nan" || v.toLowerCase() === "null") {
            nullCount++
          }
        }
      }
      if (nullCount > 0) {
        issues.push(`null/NaN/empty values in value columns: ${nullCount}`)
        ok = false
      }

      if (sampleNumericCols) {
        for (const col of sampleNumericCols) {
          const idx = sub.headers.indexOf(col)
          if (idx < 0) continue
          const bad = sub.rows.find((r) => r[idx] !== undefined && r[idx] !== "" && !isNumeric(r[idx]))
          if (bad) {
            issues.push(`non-numeric value in column ${col}: "${bad[idx]}"`)
            ok = false
          }
        }
      }

      const summary = [
        ok ? "OK: submission looks valid" : "FAIL: submission has issues",
        `rows=${sub.rows.length} cols=${sub.headers.join(",")}`,
        ...issues.map((i) => `- ${i}`),
      ].join("\n")

      return {
        content: [{ type: "text", text: summary }],
        details: { ok, issues, rows: sub.rows.length, headers: sub.headers },
      }
    },
  })
}
