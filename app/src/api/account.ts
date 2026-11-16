// Server functions for your organization and the local data: the connection,
// the usage plan, the limits and the request log.
import { createServerFn } from "@tanstack/react-start"
import type { Status, Usage } from "@/lib/types"
import { saveUsage } from "@/server/allowance"
import { apiGet } from "@/server/client"
import { config, keyHint } from "@/server/config"
import { clearAll, getDb } from "@/server/db"
import { getQuota, getRates } from "@/server/limits"
import { recentRequests } from "@/server/request-log"

export const getStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<Status> => {
    const { mode, baseUrl, reserve } = config()
    const organizations =
      await apiGet<{ id: number; name: string }[]>("organizations/")
    const usage = await apiGet<Usage>("usage/")
    if (usage.ok && mode === "live") saveUsage(usage.data)
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
        cache: count("select count(*) n from api_cache"),
        tracked: count("select count(*) n from tracked_products"),
        snapshots: count("select count(*) n from product_snapshots"),
        requests: count("select count(*) n from request_log"),
      },
      researchToday: {
        live: count(
          "select count(*) n from request_log where research = 1 and from_cache = 0 and status = 200 and mode = ? and at >= ?",
          mode,
          day
        ),
        cached: count(
          "select count(*) n from request_log where research = 1 and from_cache = 1 and mode = ? and at >= ?",
          mode,
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

export const clearLocalData = createServerFn({ method: "POST" }).handler(
  async () => {
    clearAll()
    return { ok: true }
  }
)
