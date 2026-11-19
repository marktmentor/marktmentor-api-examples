import "@tanstack/react-start/server-only"

// The local cache. Research data is a daily snapshot, so an answer is kept
// for its data day (lib/data-day.ts) and the same question costs nothing.
import { dataDay } from "@/lib/data-day"
import { isSnapshotKey } from "@/lib/snapshot-key"
import { config } from "./config"
import { getDb } from "./db"

/**
 * The cache key: mode, path and the sorted, non-empty query parameters. The
 * test key applies every filter too, so each filter has its own answer.
 */
export function cacheKey(path: string, params: Record<string, unknown>) {
  const query = Object.keys(params)
    .filter(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== ""
    )
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join("&")
  return `${config().mode}:${path}?${query}`
}

type Row = { body: string; fetched_at: string }
const parse = <T>(row: Row) => ({
  data: JSON.parse(row.body) as T,
  fetchedAt: row.fetched_at,
})

/** Today's answer (this data day), or null. */
export function readToday<T>(key: string) {
  const row = getDb()
    .prepare(
      "select body, fetched_at from api_cache where key = ? and fetched_day = ?"
    )
    .get(key, dataDay()) as Row | undefined
  return row ? parse<T>(row) : null
}

export function writeCache(
  key: string,
  path: string,
  body: unknown,
  fetchedAt: string
) {
  getDb()
    .prepare(
      `insert into api_cache (key, mode, path, body, fetched_day, fetched_at) values (?, ?, ?, ?, ?, ?)
       on conflict(key) do update set body = excluded.body, fetched_day = excluded.fetched_day, fetched_at = excluded.fetched_at`
    )
    .run(key, config().mode, path, JSON.stringify(body), dataDay(), fetchedAt)
}

/**
 * The last stored answer for a request, of any day, without calling the API.
 * The overview uses it for trend lines: they never cost a request on load.
 */
export function cachedAnswer<T>(path: string, params: Record<string, unknown>) {
  const row = getDb()
    .prepare("select body, fetched_at from api_cache where key = ?")
    .get(cacheKey(path, params)) as Row | undefined
  return row ? parse<T>(row) : null
}

/**
 * The bodies of today's research answers for both markets and 30 days,
 * newest first. Snapshots compare days, so they use only these figures.
 */
export function todaysSnapshotBodies(): string[] {
  const rows = getDb()
    .prepare(
      `select key, body from api_cache where mode = ? and fetched_day = ? and path like 'research/%'
         order by fetched_at desc`
    )
    .all(config().mode, dataDay()) as { key: string; body: string }[]
  return rows.filter((r) => isSnapshotKey(r.key)).map((r) => r.body)
}
