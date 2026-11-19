import "@tanstack/react-start/server-only"

// Keeps the local database small: old rows go, and each table has a maximum.
// It runs at most once an hour, on the next logged request.
import { clearOwner, getDb } from "./db"

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** Request log: 30 days, at most 20,000 rows. */
const LOG_DAYS = 30
const LOG_ROWS = 20_000
/**
 * Cached answers: 62 days, at most 5,000 rows. A trend line on the overview
 * reads its last stored answer, also of an earlier day; after two months the
 * overview asks to load it again.
 */
const CACHE_DAYS = 62
const CACHE_ROWS = 5_000
/** Demo visitors: their followed products and log go after 7 days without a visit. */
const DEMO_VISITOR_DAYS = 7

let lastRun = 0

const before = (days: number) => new Date(Date.now() - days * DAY).toISOString()

export function keepSmall() {
  if (Date.now() - lastRun < HOUR) return
  lastRun = Date.now()
  const db = getDb()
  db.prepare("delete from request_log where at < ?").run(before(LOG_DAYS))
  db.prepare(
    "delete from request_log where id <= (select max(id) from request_log) - ?"
  ).run(LOG_ROWS)
  db.prepare("delete from api_cache where fetched_day < ?").run(
    before(CACHE_DAYS).slice(0, 10)
  )
  db.prepare(
    `delete from api_cache where key not in
       (select key from api_cache order by fetched_at desc limit ?)`
  ).run(CACHE_ROWS)
  const gone = db
    .prepare("select owner from demo_visitors where seen_at < ?")
    .all(before(DEMO_VISITOR_DAYS)) as { owner: string }[]
  for (const { owner } of gone) clearOwner(owner)
}
