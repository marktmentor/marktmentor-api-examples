import "@tanstack/react-start/server-only"

// Every call the app makes, answered by the API or by the local cache. The
// usage meter and the API usage page read this log; they never call the API.
import type { RequestLogRow } from "@/lib/types"
import { config } from "./config"
import { getDb } from "./db"
import { type Rate, bucketOf } from "./limits"

export function logRequest(
  path: string,
  status: number,
  fromCache: boolean,
  requestId?: string | null,
  rate?: Rate | null
) {
  getDb()
    .prepare(
      `insert into request_log (at, mode, path, status, research, from_cache, request_id,
         bucket, rate_limit, rate_remaining, retry_after) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      new Date().toISOString(),
      config().mode,
      path,
      status,
      bucketOf(path) === "research" ? 1 : 0,
      fromCache ? 1 : 0,
      requestId ?? null,
      bucketOf(path),
      rate?.limit ?? null,
      rate?.remaining ?? null,
      rate?.retryAfter ?? null
    )
}

export function recentRequests(limit = 15): RequestLogRow[] {
  return getDb()
    .prepare(
      `select id, at, path, status, from_cache as fromCache, bucket, rate_limit as rateLimit,
         rate_remaining as rateRemaining, retry_after as retryAfter, request_id as requestId
       from request_log where mode = ? order by id desc limit ?`
    )
    .all(config().mode, limit) as RequestLogRow[]
}
