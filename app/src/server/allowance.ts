import "@tanstack/react-start/server-only"

// The research allowance, read again from usage/ (free) when the stored
// value may be old: after the reset moment, or when the app stopped at the
// reserve or without access. Without this the app would never see a renewed
// bundle or a new grant, because it sends no research call while it stops.
import type { ApiResult, Usage } from "@/lib/types"
import { config } from "./config"
import { getMeta, setMeta } from "./db"
import { getQuota, saveQuota } from "./limits"

type FetchUsage = () => Promise<ApiResult<Usage>>

/** Keep what usage/ says: the plan, and the counts of a bundle or the free requests. */
export function saveUsage(usage: Usage) {
  if (usage.plan === "bundle" && usage.bundle) {
    saveQuota({
      plan: usage.plan,
      researchLimit: usage.bundle.includedRequests,
      researchRemaining: usage.bundle.remainingRequests,
      researchReset: usage.bundle.periodEnd,
    })
  } else if (usage.plan === "free" && usage.freeTier) {
    // The 100 free requests per month count like a small bundle: the app
    // stops at the reserve here too.
    saveQuota({
      plan: usage.plan,
      researchLimit: usage.freeTier.limit,
      researchRemaining: usage.freeTier.remaining,
      researchReset: usage.freeTier.resetsAt,
    })
  } else {
    // Unmetered or none: there is no counted allowance to stop on.
    saveQuota({
      plan: usage.plan,
      researchLimit: undefined,
      researchRemaining: undefined,
      researchReset: undefined,
    })
  }
}

/**
 * Read usage/ again, at most once a minute. Returns true when it did. The
 * caller passes the fetch, so this file does not depend on the API client.
 */
export async function refreshAllowance(
  fetchUsage: FetchUsage
): Promise<boolean> {
  const { mode } = config()
  if (mode === "demo") return false
  const key = `usageCheckedAt:${mode}`
  const last = getMeta<string>(key)
  if (last && Date.now() - Date.parse(last) < 60_000) return false
  setMeta(key, new Date().toISOString())
  const usage = await fetchUsage()
  if (usage.ok) saveUsage(usage.data)
  return usage.ok
}

/** True when the stored allowance is past its reset moment. */
export function allowanceExpired() {
  const reset = getQuota()?.researchReset
  return reset !== undefined && Date.parse(reset) <= Date.now()
}
