import "@tanstack/react-start/server-only"

import { mkdirSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { config } from "./config"

// One local SQLite file. It holds API data for your own use only (see the
// general terms). "Clear local data" on the API usage page deletes the rows of
// the owner (server/owner.ts); server/retention.ts keeps the file small.
//
// api_cache and meta are per mode: the answers and limits of one key.
// tracked_products, product_snapshots and request_log are per owner: "live"
// with your own key, one "demo:<id>" per browser in demo mode.
const SCHEMA = `
create table if not exists api_cache (
  key text primary key,          -- mode + path + sorted query
  mode text not null,            -- live or demo: never mixed
  path text not null,
  body text not null,            -- the response body, unchanged
  fetched_day text not null,     -- research data is a daily snapshot
  fetched_at text not null
);
create table if not exists tracked_products (
  owner text not null,
  product_code text not null,
  ean text,
  title text,
  image_url text,
  added_at text not null,
  primary key (owner, product_code)
);
create table if not exists product_snapshots (
  owner text not null,
  product_code text not null,
  day text not null,             -- updatedAt of the API data
  market text not null,
  price real, sales real, revenue real,
  rating real, review_count integer,
  primary key (owner, product_code, day, market)
);
create table if not exists request_log (
  id integer primary key autoincrement,
  at text not null,
  owner text not null,
  path text not null,
  status integer not null,
  research integer not null,
  from_cache integer not null,
  request_id text,
  bucket text,                   -- research, store, account or reference: each has its own limit
  rate_limit integer,            -- RateLimit-Limit of the response
  rate_remaining integer,        -- RateLimit-Remaining of the response
  retry_after integer            -- Retry-After of a 429
);
create index if not exists request_log_owner_at on request_log (owner, at);
create index if not exists api_cache_fetched_at on api_cache (fetched_at);
create table if not exists demo_visitors (
  owner text primary key,        -- demo:<id> of one browser
  seen_at text not null          -- the last request: old visitors are deleted
);
create table if not exists meta (key text primary key, value text not null);
`

let db: Database.Database | undefined

export function getDb() {
  if (!db) {
    const file = config().dbPath
    mkdirSync(path.dirname(file), { recursive: true })
    db = new Database(file)
    db.pragma("journal_mode = WAL")
    renameModeToOwner(db)
    db.exec(SCHEMA)
  }
  return db
}

/**
 * A database of an older version of this app has a column "mode" where the
 * per-owner tables now have "owner". The values stay valid: "live" is the
 * owner of the live mode; old "demo" rows belong to no visitor and are removed.
 */
function renameModeToOwner(d: Database.Database) {
  for (const table of [
    "tracked_products",
    "product_snapshots",
    "request_log",
  ]) {
    const columns = d.prepare(`pragma table_info(${table})`).all() as {
      name: string
    }[]
    if (!columns.some((c) => c.name === "mode")) continue
    d.exec(`alter table ${table} rename column mode to owner`)
    d.prepare(`delete from ${table} where owner = 'demo'`).run()
  }
  d.exec("drop index if exists request_log_mode_at")
}

/** Delete all local data: with your own key, the whole file is yours. */
export function clearAll() {
  const d = getDb()
  d.exec(
    "delete from api_cache; delete from tracked_products; delete from product_snapshots; delete from request_log; delete from demo_visitors; delete from meta;"
  )
  d.exec("vacuum")
}

/** Delete the followed products, snapshots and request log of one owner. */
export function clearOwner(owner: string) {
  const d = getDb()
  for (const table of [
    "tracked_products",
    "product_snapshots",
    "request_log",
    "demo_visitors",
  ])
    d.prepare(`delete from ${table} where owner = ?`).run(owner)
}

export function getMeta<T>(key: string): T | undefined {
  const row = getDb()
    .prepare("select value from meta where key = ?")
    .get(key) as { value: string } | undefined
  return row ? (JSON.parse(row.value) as T) : undefined
}

export function setMeta(key: string, value: unknown) {
  getDb()
    .prepare(
      "insert into meta (key, value) values (?, ?) on conflict(key) do update set value = excluded.value"
    )
    .run(key, JSON.stringify(value))
}
