import "@tanstack/react-start/server-only"

// The API client: one GET to the MarktMentor Public API. It runs on the
// server only, so the key never leaves this process. It returns a result
// object instead of throwing, so a page can show a clear message.
import type { ApiFailure, ApiResult, Usage } from "@/lib/types"
import { allowanceExpired, refreshAllowance } from "./allowance"
import { cacheKey, readToday, writeCache } from "./cache"
import { config } from "./config"
import { demoBody } from "./demo"
import {
  type Rate,
  bucketOf,
  demoRate,
  getQuota,
  readQuota,
  readRate,
  saveQuota,
} from "./limits"
import { logRequest } from "./request-log"

const API_PREFIX = "/api/public/v1/"

type GetOptions = {
  /** Reuse today's answer. Default: research and reference (they change once a day). */
  cache?: boolean
  /** Fetch again even when today's answer is in the cache. */
  refresh?: boolean
}

function failure(
  status: number,
  code: string,
  detail: string,
  extra: Partial<ApiFailure> = {}
): ApiFailure {
  return { ok: false, status, code, detail, ...extra }
}

export async function apiGet<T>(
  path: string,
  params: Record<string, unknown> = {},
  options: GetOptions = {}
): Promise<ApiResult<T>> {
  const { mode, reserve } = config()
  const bucket = bucketOf(path)
  const cache =
    options.cache ?? (bucket === "research" || bucket === "reference")
  const key = cacheKey(path, params)

  if (cache && !options.refresh) {
    const hit = readToday<T>(key)
    if (hit) {
      logRequest(path, 200, true)
      return { ok: true, ...hit, fromCache: true, mode }
    }
  }

  if (mode === "demo") {
    const body = demoBody(path, params)
    if (body === undefined)
      return failure(404, "not_found", "No sample data for this path.")
    return success<T>(key, path, body, cache, null, demoRate(path))
  }

  // Stop before the allowance is used up (MARKTMENTOR_RESERVE). The stored
  // value can be old (a renewed bundle, a new grant): read usage/ again first.
  if (bucket === "research") {
    const left = () => getQuota()?.researchRemaining
    const atReserve = () => left() !== undefined && left()! <= reserve
    if (atReserve() || allowanceExpired())
      await refreshAllowance(() => apiGet<Usage>("usage/"))
    // Status 0: the app stopped itself, no HTTP request was sent.
    if (atReserve())
      return failure(0, "reserve_reached", "", { left: left(), reserve })
  }

  return fetchLive<T>(path, params, key, cache)
}

async function fetchLive<T>(
  path: string,
  params: Record<string, unknown>,
  key: string,
  cache: boolean
): Promise<ApiResult<T>> {
  const { apiKey, baseUrl } = config()
  const url = new URL(
    `${baseUrl}${API_PREFIX}${path.endsWith("/") ? path : `${path}/`}`
  )
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== "")
      url.searchParams.set(k, String(v))

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "User-Agent": "marktmentor-api-example-app/1.0",
      },
      redirect: "manual",
      // A hung connection must not keep a page waiting.
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    return failure(0, "network_error", String(error))
  }
  readQuota(response.headers)
  const rate = readRate(response.headers, path)
  const requestId = response.headers.get("X-Request-ID")

  if (response.ok)
    return success<T>(key, path, await response.json(), cache, requestId, rate)

  logRequest(path, response.status, false, requestId, rate)
  const text = await response.text()
  if (!(response.headers.get("Content-Type") ?? "").includes("json")) {
    return failure(
      response.status,
      response.status === 404 ? "not_found_html" : "unexpected_response",
      text.slice(0, 120)
    )
  }
  let body: {
    code?: string
    detail?: string
    errors?: Record<string, string[]>
  } = {}
  try {
    body = JSON.parse(text)
  } catch {}
  return failure(
    response.status,
    body.code ?? "request_failed",
    body.detail ?? "",
    {
      errors: body.errors,
      retryAfter:
        Number(response.headers.get("Retry-After") ?? "") || undefined,
      requestId,
    }
  )
}

function success<T>(
  key: string,
  path: string,
  body: unknown,
  cache: boolean,
  requestId: string | null,
  rate: Rate | null
): ApiResult<T> {
  const { mode } = config()
  const fetchedAt = new Date().toISOString()
  if (cache) writeCache(key, path, body, fetchedAt)
  logRequest(path, 200, false, requestId, rate)
  if (mode === "demo" && bucketOf(path) === "research") {
    // The demo has no real headers: count down the imitated bundle.
    const left = getQuota()?.researchRemaining
    if (left !== undefined) saveQuota({ researchRemaining: left - 1 })
  }
  return { ok: true, data: body as T, fromCache: false, fetchedAt, mode }
}
