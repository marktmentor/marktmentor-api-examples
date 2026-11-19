import "@tanstack/react-start/server-only"

// The API client: one GET to the MarktMentor Public API, through the official
// SDK (@marktmentor/api). It runs on the server only, so the key never leaves
// this process. It returns a result object instead of throwing, so a page can
// show a clear message. Around the SDK call it keeps today's answer in the
// cache, stops at the reserve and logs each request.
import { MarktMentorClient, MarktMentorError } from "@marktmentor/api"
import type { ApiFailure, ApiResult, Usage } from "@/lib/types"
import { allowanceExpired, refreshAllowance } from "./allowance"
import { cacheKey, readToday, writeCache } from "./cache"
import { TEST_KEY, config } from "./config"
import { type Rate, bucketOf, getQuota, readQuota, readRate } from "./limits"
import { logRequest } from "./request-log"

/** The answer of an SDK call with its HTTP response (for the limit headers). */
type Raw = { data: unknown; rawResponse: { headers: Headers } }
/**
 * One SDK call. A single answer comes as a promise with withRawResponse(); a
 * list comes as a page with its response and rawResponse. apiGet needs the
 * HTTP response of both, for the limit headers.
 */
export type Send = (
  mm: MarktMentorClient
) =>
  | { withRawResponse: () => Promise<Raw> }
  | Promise<{ response: unknown; rawResponse: { headers: Headers } }>

async function answer(call: ReturnType<Send>): Promise<Raw> {
  if ("withRawResponse" in call) return call.withRawResponse()
  const page = await call
  return { data: page.response, rawResponse: page.rawResponse }
}

let sdk: { key: string; baseUrl: string; client: MarktMentorClient } | null =
  null

/** The SDK client for the key of this mode. Demo mode: only the public test key. */
export function client(): MarktMentorClient {
  const { apiKey, mode, baseUrl } = config()
  // config() never gives another key in demo mode; this check makes the
  // rule visible and stops the request if that ever changes.
  if (mode === "demo" && apiKey !== TEST_KEY)
    throw new Error("Demo mode sends only the public test key.")
  if (sdk?.key !== apiKey || sdk.baseUrl !== baseUrl)
    sdk = {
      key: apiKey,
      baseUrl,
      client: new MarktMentorClient({
        token: apiKey,
        baseUrl,
        // The app shows a 429 or 503 to the user and does not wait itself.
        maxRetries: 0,
        // A hung connection must not keep a page waiting.
        timeoutInSeconds: 30,
      }),
    }
  return sdk.client
}

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

// One request per cache key at a time: visitors who open the same page
// together share one API call (the hosted demo has one IP and one limit).
const inFlight = new Map<string, Promise<ApiResult<unknown>>>()

/**
 * One API request through the SDK. `path` and `params` name the request in the
 * cache and the request log; `send` is the SDK call itself.
 */
export async function apiGet<T>(
  path: string,
  params: Record<string, unknown>,
  send: Send,
  options: GetOptions = {}
): Promise<ApiResult<T>> {
  const { mode, reserve } = config()
  const demo = mode === "demo"
  const bucket = bucketOf(path)
  // Demo mode: the test key answers from recorded data, so every answer is
  // kept for the day and "refresh" reads the cache too. This keeps the demo below the
  // per-minute limit of the test key (one limit for all visitors).
  const cache =
    demo || (options.cache ?? (bucket === "research" || bucket === "reference"))
  const key = cacheKey(path, params)

  if (cache && (demo || !options.refresh)) {
    const hit = readToday<T>(key)
    if (hit) {
      logRequest(path, 200, true)
      return { ok: true, ...hit, fromCache: true, mode }
    }
  }

  // Stop before the allowance is used up (MARKTMENTOR_RESERVE). The stored
  // value can be old (a renewed bundle, a new grant): read usage/ again first.
  // The test key has no allowance, so demo mode skips this.
  if (!demo && bucket === "research") {
    const left = () => getQuota()?.researchRemaining
    const atReserve = () => left() !== undefined && left()! <= reserve
    if (atReserve() || allowanceExpired()) await refreshAllowance(getUsage)
    // Status 0: the app stopped itself, no HTTP request was sent.
    if (atReserve())
      return failure(0, "reserve_reached", "", { left: left(), reserve })
  }

  if (!cache) return fetchLive<T>(path, send, key, cache)
  const running = inFlight.get(key)
  if (running) {
    // Another request fetches the same answer: share it, and log it for
    // this caller too (the log is per owner) as a reused answer.
    const shared = (await running) as ApiResult<T>
    if (shared.ok) {
      logRequest(path, 200, true)
      return { ...shared, fromCache: true }
    }
    if (shared.status) logRequest(path, shared.status, false)
    return shared
  }
  const request = fetchLive<T>(path, send, key, cache).finally(() =>
    inFlight.delete(key)
  )
  inFlight.set(key, request)
  return request
}

/** GET usage/ (free): the plan and the allowance. */
export const getUsage = () =>
  apiGet<Usage>("usage/", {}, (mm) => mm.usage.get())

async function fetchLive<T>(
  path: string,
  send: Send,
  key: string,
  cache: boolean
): Promise<ApiResult<T>> {
  let result: Raw
  try {
    result = await answer(send(client()))
  } catch (error) {
    return failed(path, error)
  }
  const headers = result.rawResponse.headers
  readQuota(headers)
  const rate = readRate(headers, path)
  const requestId = headers.get("X-Request-ID")
  return success<T>(key, path, result.data, cache, requestId, rate)
}

/** An error of the SDK as a result: the API code, or what went wrong. */
function failed(path: string, error: unknown): ApiFailure {
  if (!(error instanceof MarktMentorError) || error.statusCode === undefined)
    return failure(0, "network_error", String(error))
  const status = error.statusCode
  const headers = error.rawResponse?.headers
  if (headers) readQuota(headers)
  const rate = headers ? readRate(headers, path) : null
  const requestId = headers?.get("X-Request-ID") ?? null
  logRequest(path, status, false, requestId, rate)
  const testKey = headers?.get("X-MarktMentor-Test-Key") === "true"
  // A JSON error has a code; a text body is an HTML page (a wrong path or URL).
  if (typeof error.body !== "object" || error.body === null)
    return failure(
      status,
      status === 404 ? "not_found_html" : "unexpected_response",
      String(error.body ?? "").slice(0, 120),
      { testKey }
    )
  const body = error.body as {
    code?: string
    detail?: string
    errors?: Record<string, string[]>
  }
  return failure(status, body.code ?? "request_failed", body.detail ?? "", {
    errors: body.errors,
    retryAfter: Number(headers?.get("Retry-After") ?? "") || undefined,
    requestId,
    testKey,
  })
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
  return { ok: true, data: body as T, fromCache: false, fetchedAt, mode }
}
