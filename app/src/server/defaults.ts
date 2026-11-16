import "@tanstack/react-start/server-only"

import { dataDay } from "@/lib/data-day"
import type { ApiResult, SkipReason, Usage } from "@/lib/types"
import { allowanceExpired, refreshAllowance } from "./allowance"
import { apiGet } from "./client"
import { getQuota } from "./limits"
import { config } from "./config"
import { getMeta, setMeta } from "./db"

// The rule for what a page may fetch on its own (see the README):
// a page may fetch its own default content once when it opens, if that costs
// one research request and stays in the cache for the day. Everything that
// costs more, or goes per product (tabs, trends, variants), waits for a click.

export type DefaultList<T> =
  | { kind: "result"; result: ApiResult<T> }
  | { kind: "skipped"; reason: SkipReason }

/** The last research 403 of this mode: which code, on which data day. */
type NoAccessMemo = { day: string; code: string } | null

const NO_ACCESS_CODES = new Set([
  "product_research_api_required",
  "subscription_required",
  "bundle_payment_failed",
])

/** Fetch a default list, unless we know it cannot or should not be fetched. */
export async function defaultList<T>(
  path: string,
  params: Record<string, unknown>
): Promise<DefaultList<T>> {
  const { mode, reserve } = config()
  const memo = `noResearch:${mode}`
  const last = () => getMeta<NoAccessMemo>(memo) ?? null
  const noAccess = () =>
    getQuota()?.plan === "none" || last()?.day === dataDay()
  const atReserve = () => {
    const left = getQuota()?.researchRemaining
    return left !== undefined && left <= reserve
  }
  // Known stop (no access, or the reserve): check usage/ again first (free, at
  // most once a minute), because a new grant or bundle lifts the stop.
  if (noAccess() || atReserve() || allowanceExpired()) {
    if (await refreshAllowance(() => apiGet<Usage>("usage/")))
      if (getQuota()?.plan !== "none") setMeta(memo, null)
  }
  // No research access (known from usage/ or from a 403 today): do not ask again.
  // usage/ says plan "none" for both; the 403 code tells a failed payment apart.
  if (noAccess())
    return {
      kind: "skipped",
      reason:
        last()?.code === "bundle_payment_failed" ? "paymentFailed" : "noAccess",
    }
  if (atReserve()) return { kind: "skipped", reason: "reserve" }
  // apiGet uses today's cached answer when there is one: no request.
  const result = await apiGet<T>(path, params)
  // No access (no paid Premium, or a failed renewal payment): do not ask again today.
  if (!result.ok && NO_ACCESS_CODES.has(result.code))
    setMeta(memo, { day: dataDay(), code: result.code })
  return { kind: "result", result }
}
