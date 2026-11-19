// Server functions for your organization and the local data: the connection,
// the usage plan, the limits and the request log.
import { createServerFn } from "@tanstack/react-start"
import type { Status } from "@/lib/types"
import { saveUsage } from "@/server/allowance"
import { apiGet, getUsage } from "@/server/client"
import { config, keyHint } from "@/server/config"
import { clearAll, clearOwner, getDb } from "@/server/db"
import { getQuota, getRates } from "@/server/limits"
import { owner } from "@/server/owner"
import { recentRequests } from "@/server/request-log"

export const getStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<Status> => {
    const { mode, baseUrl, reserve } = config()
    const organizations = await apiGet<{ id: number; name: string }[]>(
      "organizations/",
      {},
      (mm) => mm.organization.get()
    )
    const usage = await getUsage()
    if (usage.ok && mode === "live") saveUsage(usage.data)
    const who = owner()
    const db = getDb()
    const count = (sql: string, ...args: unknown[]) =>
      (db.prepare(sql).get(...args) as { n: number }).n
    const day = new Date().toISOString().slice(0, 10)
    return {
      mode,
      baseUrl,
      reserve,
      keyHint: keyHint(),
      quota: getQuota() ?? null,
      usage,
      organizations,
      localRows: {
        cache: count("select count(*) n from api_cache where mode = ?", mode),
        tracked: count(
          "select count(*) n from tracked_products where owner = ?",
          who
        ),
        snapshots: count(
          "select count(*) n from product_snapshots where owner = ?",
          who
        ),
        requests: count(
          "select count(*) n from request_log where owner = ?",
          who
        ),
      },
      researchToday: {
        live: count(
          "select count(*) n from request_log where research = 1 and from_cache = 0 and status = 200 and owner = ? and at >= ?",
          who,
          day
        ),
        cached: count(
          "select count(*) n from request_log where research = 1 and from_cache = 1 and owner = ? and at >= ?",
          who,
          day
        ),
      },
    }
  }
)

export const getQuotaNow = createServerFn({ method: "GET" }).handler(
  async () => ({
    mode: config().mode,
    reserve: config().reserve,
    quota: getQuota() ?? null,
    rates: getRates(),
  })
)

/** The last requests from the local log, newest first. */
export const getRecentRequests = createServerFn({ method: "GET" }).handler(
  async () => recentRequests(15)
)

/**
 * With your own key: delete all local data. In demo mode: only the followed
 * products, snapshots and request log of this browser; the shared cache of
 * test-key answers stays.
 */
export const clearLocalData = createServerFn({ method: "POST" }).handler(
  async () => {
    if (config().mode === "live") clearAll()
    else clearOwner(owner())
    return { ok: true }
  }
)
