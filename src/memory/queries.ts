export function topBy<T extends Record<string, unknown>>(
  records: T[],
  field: string,
  direction: "asc" | "desc",
  limit: number,
): T[] {
  const sorted = [...records].sort((a, b) => {
    const aVal = getNestedValue(a, field) as number ?? 0
    const bVal = getNestedValue(b, field) as number ?? 0
    return direction === "asc" ? aVal - bVal : bVal - aVal
  })
  return sorted.slice(0, limit)
}

export function matchesFilter<T extends Record<string, unknown>>(
  record: T,
  filter: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    const recordVal = record[key]
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      if (typeof recordVal !== "object" || recordVal === null) return false
      if (!matchesFilter(recordVal as Record<string, unknown>, value as Record<string, unknown>)) {
        return false
      }
    } else if (recordVal !== value) {
      return false
    }
  }
  return true
}

export function groupBy<T extends Record<string, unknown>>(
  records: T[],
  field: string,
  aggregations: Record<string, "min" | "max" | "sum" | "count" | "avg">,
): Record<string, Record<string, number>> {
  const groups: Record<string, T[]> = {}
  for (const record of records) {
    const key = String(getNestedValue(record, field) ?? "unknown")
    if (!groups[key]) groups[key] = []
    groups[key].push(record)
  }

  const result: Record<string, Record<string, number>> = {}
  for (const [key, group] of Object.entries(groups)) {
    result[key] = {}
    for (const [aggField, aggType] of Object.entries(aggregations)) {
      if (aggType === "count") {
        result[key][aggField] = group.length
      } else {
        const values = group
          .map(r => getNestedValue(r, aggField) as number)
          .filter(v => typeof v === "number" && !Number.isNaN(v))
        if (values.length === 0) {
          result[key][aggField] = 0
          continue
        }
        switch (aggType) {
          case "min": result[key][aggField] = Math.min(...values); break
          case "max": result[key][aggField] = Math.max(...values); break
          case "sum": result[key][aggField] = values.reduce((a, b) => a + b, 0); break
          case "avg": result[key][aggField] = values.reduce((a, b) => a + b, 0) / values.length; break
        }
      }
    }
  }
  return result
}

export function byTags<T extends Record<string, unknown> & { tags: string[] }>(
  records: T[],
  tags: string[],
): T[] {
  return records.filter(r => tags.some(t => r.tags.includes(t)))
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}
