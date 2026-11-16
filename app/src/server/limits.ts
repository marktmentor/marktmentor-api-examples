import "@tanstack/react-start/server-only"

// The two limits of the API, from the response headers: the research
// allowance (X-Research-Requests-*) and the per-minute windows (RateLimit-*).
import type { Bucket, Quota, RateWindow, Rates } from "@/lib/types"
import { config } from "./config"
import { getDb, getMeta, setMeta } from "./db"

export type Rate = { limit: number; remaining: number; retryAfter?: number }

/** Each group of endpoints has its own per-minute limit. */
export function bucketOf(path: string): Bucket {
  if (path.startsWith("research/")) return "research"
  if (path.startsWith("store/")) return "store"
  if (path.startsWith("reference/")) return "reference"
  return "account"
}

export function getQuota(): Quota | undefined {
  return getMeta<Quota>(`quota:${config().mode}`)
}

export function saveQuota(patch: Partial<Quota>) {
  setMeta(`quota:${config().mode}`, {
    ...(getQuota() ?? {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  })
}

/** Keep the X-Research-Requests-* and RateLimit-* headers of a response. */
export function readQuota(headers: Headers) {
  const num = (name: string) => {
    const v = headers.get(name)
    return v === null ? undefined : Number(v)
  }
  const patch: Partial<Quota> = {}
  const limit = num("X-Research-Requests-Limit")
  const remaining = num("X-Research-Requests-Remaining")
  const reset = headers.get("X-Research-Requests-Reset")
  if (limit !== undefined) patch.researchLimit = limit
  if (remaining !== undefined) patch.researchRemaining = remaining
  if (reset) patch.researchReset = reset
  if (num("RateLimit-Limit") !== undefined)
    patch.rateLimit = num("RateLimit-Limit")
  if (num("RateLimit-Remaining") !== undefined)
    patch.rateRemaining = num("RateLimit-Remaining")
  saveQuota(patch)
}

export function getRates(): Rates {
  return getMeta<Rates>(`rate:${config().mode}`) ?? {}
}

function saveWindow(path: string, window: RateWindow) {
  setMeta(`rate:${config().mode}`, { ...getRates(), [bucketOf(path)]: window })
}

/** RateLimit-* of one response, kept per bucket with the moment it has room again. */
export function readRate(headers: Headers, path: string): Rate | null {
  const limit = headers.get("RateLimit-Limit")
  const remaining = headers.get("RateLimit-Remaining")
  if (limit === null || remaining === null) return null
  const reset = Number(headers.get("RateLimit-Reset") ?? "0")
  const retryAfter = Number(headers.get("Retry-After") ?? "") || undefined
  const rate: Rate = {
    limit: Number(limit),
    remaining: Number(remaining),
    retryAfter,
  }
  saveWindow(path, {
    limit: rate.limit,
    remaining: rate.remaining,
    resetAt: new Date(
      Date.now() + Math.max(reset, retryAfter ?? 0) * 1000
    ).toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return rate
}

const DEMO_LIMITS: Record<Bucket, number> = {
  research: 30,
  store: 60,
  account: 30,
  reference: 120,
}

/** The demo has no real headers: imitate the limits from the local log. */
export function demoRate(path: string): Rate {
  const bucket = bucketOf(path)
  const limit = DEMO_LIMITS[bucket]
  const since = new Date(Date.now() - 60_000).toISOString()
  const used = (
    getDb()
      .prepare(
        "select count(*) n from request_log where mode = 'demo' and from_cache = 0 and bucket = ? and at >= ?"
      )
      .get(bucket, since) as { n: number }
  ).n
  const rate = { limit, remaining: Math.max(limit - used - 1, 0) }
  saveWindow(path, {
    ...rate,
    resetAt: new Date(Date.now() + 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return rate
}
