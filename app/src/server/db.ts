import "@tanstack/react-start/server-only"

import { mkdirSync } from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { config } from "./config"

// One local SQLite file. It holds API data for your own use only (see the
// API terms). "Clear local data" on the API usage page deletes all rows.
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
  mode text not null,
  product_code text not null,
  ean text,
  title text,
  image_url text,
  added_at text not null,
  primary key (mode, product_code)
);
create table if not exists product_snapshots (
  mode text not null,
  product_code text not null,
  day text not null,             -- updatedAt of the API data
  market text not null,
  price real, sales real, revenue real,
  rating real, review_count integer,
  primary key (mode, product_code, day, market)
);
create table if not exists request_log (
  id integer primary key autoincrement,
  at text not null,
  mode text not null,
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
create index if not exists request_log_mode_at on request_log (mode, at);
create table if not exists meta (key text primary key, value text not null);
`

let db: Database.Database | undefined

export function getDb() {
  if (!db) {
    const file = config().dbPath
    mkdirSync(path.dirname(file), { recursive: true })
    db = new Database(file)
    db.pragma("journal_mode = WAL")
    db.exec(SCHEMA)
  }
  return db
}

export function clearAll() {
  const d = getDb()
  d.exec(
    "delete from api_cache; delete from tracked_products; delete from product_snapshots; delete from request_log; delete from meta;"
  )
  d.exec("vacuum")
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
