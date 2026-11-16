import "@tanstack/react-start/server-only"

// Sample data from the API reference (research recorded on the date in the
// file; store and organization data are fictional). Not live data.
import demo from "../../../demo-data/demo.json"
import { getDb } from "./db"
import { saveQuota } from "./limits"

type DemoRoute = { query: Record<string, unknown>; response: unknown }
const routes = demo.routes as Record<string, DemoRoute | undefined>

export const DEMO_NOTICE = demo.notice
export const DEMO_PRODUCT_CODE = demo.productCode
export const DEMO_NICHE_ID = demo.nicheId

/** The sample response for a concrete path, or undefined. */
export function demoResponse(path: string): unknown {
  const template = path
    .replace(
      /^research\/products\/[^/]+\//,
      "research/products/{product_code}/"
    )
    .replace(/^research\/niches\/\d+\//, "research/niches/{niche_id}/")
    .replace(
      /^reference\/categories\/\d+\//,
      "reference/categories/{category_id}/"
    )
  const route = routes[template]
  return route ? structuredClone(route.response) : undefined
}

/** The demo answer for a request: the sample data, filtered where that is honest. */
export function demoBody(
  path: string,
  params: Record<string, unknown>
): unknown {
  const body = demoResponse(path) as Record<string, unknown> | undefined
  if (!body) return undefined
  if (path === "research/products/" && params.ean) {
    const data = (body.data as { ean: string }[]).filter(
      (p) => p.ean === params.ean
    )
    return {
      ...body,
      data,
      pagination: { page: 1, pageSize: 25, total: data.length, hasNext: false },
    }
  }
  if (path === "reference/categories/") return demoCategories(body, params)
  if (path.startsWith("reference/categories/")) {
    const id = Number(path.split("/")[2])
    const all = (
      demoResponse("reference/categories/") as {
        data: { categoryId: number }[]
      }
    ).data
    const row = all.find((c) => c.categoryId === id)
    return row ? { data: row } : undefined
  }
  if (path === "reference/brands/") {
    const q = String(params.search ?? "").toLowerCase()
    const data = (body.data as { name: string }[]).filter((b) =>
      b.name.toLowerCase().includes(q)
    )
    return { data, hasMore: false }
  }
  if (path === "usage/") return demoUsage(body)
  return body
}

/** Filter the sample categories as the API does (search, level, parentId). */
function demoCategories(
  body: Record<string, unknown>,
  params: Record<string, unknown>
) {
  type Row = { name: string; level: number; parentId: number | null }
  const words = String(params.search ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  const data = (body.data as Row[]).filter(
    (c) =>
      words.every((w) => c.name.toLowerCase().includes(w)) &&
      (params.level === undefined || c.level === Number(params.level)) &&
      (params.parentId === undefined || c.parentId === Number(params.parentId))
  )
  return {
    data,
    pagination: { page: 1, pageSize: 50, total: data.length, hasNext: false },
  }
}

/** Imitate a bundle so the usage bar has something to show. */
function demoUsage(body: Record<string, unknown>) {
  const used = (
    getDb()
      .prepare(
        "select count(*) n from request_log where mode = 'demo' and research = 1 and from_cache = 0"
      )
      .get() as { n: number }
  ).n
  const bundle = (body as { bundle: Record<string, number> }).bundle
  bundle.usedRequests = used
  bundle.remainingRequests = Math.max(bundle.includedRequests - used, 0)
  saveQuota({
    researchLimit: bundle.includedRequests,
    researchRemaining: bundle.remainingRequests,
  })
  return body
}
