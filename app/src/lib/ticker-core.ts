// How the usage meter counts the calls of one action. Pure: no imports, so
// the rule is tested on its own (tests/ticker.test.mjs).

export type LogRow = {
  id: number
  at: string
  path: string
  status: number
  research: number
  fromCache: number
}

export type CallKind = "cost" | "cache" | "free" | "failed"

/** Only a successful research call from the API uses allowance. */
export function kindOf(
  row: Pick<LogRow, "research" | "fromCache" | "status">
): CallKind {
  if (!row.research) return "free"
  if (row.fromCache) return "cache"
  return row.status >= 200 && row.status < 300 ? "cost" : "failed"
}

export type ActionSummary = {
  cost: number
  cache: number
  free: number
  failed: number
  rateLimited: boolean
}

/** The calls since the previous update, as one action. */
export function summarize(
  rows: Pick<LogRow, "research" | "fromCache" | "status">[]
): ActionSummary {
  const s: ActionSummary = {
    cost: 0,
    cache: 0,
    free: 0,
    failed: 0,
    rateLimited: false,
  }
  for (const row of rows) {
    s[kindOf(row)] += 1
    if (row.status === 429) s.rateLimited = true
  }
  return s
}
