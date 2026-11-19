// Server functions for followed products: kept in the local database per
// owner (server/owner.ts), with one snapshot per day from answers the app
// already has.
import { createServerFn } from "@tanstack/react-start"
import { fields, productCode } from "@/lib/input"
import type { ApiFailure, Product, TrackedProduct } from "@/lib/types"
import { apiGet } from "@/server/client"
import { config } from "@/server/config"
import { getDb } from "@/server/db"
import { owner } from "@/server/owner"
import { product } from "@/server/research-query"
import { productFromCache, saveSnapshot } from "@/server/snapshots"
import { trackedCodes } from "@/server/tracked"

/** The most products one demo visitor can follow: the hosted demo is public. */
export const DEMO_FOLLOW_LIMIT = 50

/** The product with both markets and 30 days, as the snapshots use it. */
const SNAPSHOT = { market: "ALL", period: "30d" } as const

/** One product from the API (or today's cache), for a snapshot. */
function fetchProduct(code: string) {
  return apiGet<{ data: Product }>(product(code), SNAPSHOT, (mm) =>
    mm.products.get(code, SNAPSHOT)
  )
}

export const listTracked = createServerFn({ method: "GET" }).handler(
  async (): Promise<TrackedProduct[]> => {
    const who = owner()
    const db = getDb()
    const rows = db
      .prepare(
        "select product_code, ean, title, added_at from tracked_products where owner = ? order by added_at desc"
      )
      .all(who) as {
      product_code: string
      ean: string | null
      title: string | null
      added_at: string
    }[]
    const snaps = db.prepare(
      "select day, market, price, sales, revenue from product_snapshots where owner = ? and product_code = ? order by day"
    )
    return rows.map((r) => ({
      productCode: r.product_code,
      ean: r.ean,
      title: r.title,
      addedAt: r.added_at,
      snapshots: snaps.all(who, r.product_code) as TrackedProduct["snapshots"],
    }))
  }
)

/** The codes of the followed products only: for the follow buttons of a list. */
export const getTrackedCodes = createServerFn({ method: "GET" }).handler(
  async () => trackedCodes()
)

/**
 * Follow or stop following a product. The browser sends only the product
 * code: the title, EAN and photo come from the API answer (today's cache, or
 * one research request), so a visitor cannot store text or links of their own.
 */
export const setTracked = createServerFn({ method: "POST" })
  .validator((input: { productCode: string; tracked: boolean }) => {
    const o = fields(input)
    return {
      productCode: productCode(o.productCode),
      tracked: o.tracked === true,
    }
  })
  .handler(
    async ({
      data,
    }): Promise<{ ok: true } | { ok: false; error: ApiFailure }> => {
      const who = owner()
      const db = getDb()
      if (!data.tracked) {
        db.prepare(
          "delete from tracked_products where owner = ? and product_code = ?"
        ).run(who, data.productCode)
        db.prepare(
          "delete from product_snapshots where owner = ? and product_code = ?"
        ).run(who, data.productCode)
        return { ok: true }
      }
      // Today's answer of a search, a niche list or the product page is
      // usually in the cache already: then following costs no request.
      let found = productFromCache(data.productCode)
      if (!found) {
        const result = await fetchProduct(data.productCode)
        if (!result.ok) return { ok: false, error: result }
        found = result.data.data
      }
      // Count after the fetch: from here to the insert nothing awaits, so
      // two follows at the same moment cannot both pass the limit.
      if (
        config().mode === "demo" &&
        trackedCodes().length >= DEMO_FOLLOW_LIMIT
      )
        return {
          ok: false,
          error: { ok: false, status: 0, code: "follow_limit", detail: "" },
        }
      db.prepare(
        "insert into tracked_products (owner, product_code, ean, title, image_url, added_at) values (?, ?, ?, ?, ?, ?) on conflict do nothing"
      ).run(
        who,
        found.productCode,
        found.ean,
        found.title,
        found.imageUrl ?? null,
        new Date().toISOString()
      )
      saveSnapshot(found)
      return { ok: true }
    }
  )

export const isTracked = createServerFn({ method: "GET" })
  .validator((input: { productCode: string }) => ({
    productCode: productCode(fields(input).productCode),
  }))
  .handler(async ({ data }) =>
    Boolean(
      getDb()
        .prepare(
          "select 1 from tracked_products where owner = ? and product_code = ?"
        )
        .get(owner(), data.productCode)
    )
  )

/** Refresh all tracked products: one research request each, at most once a day. */
export const refreshTracked = createServerFn({ method: "POST" }).handler(
  async () => {
    let fetched = 0
    let cached = 0
    for (const code of trackedCodes()) {
      const result = await fetchProduct(code)
      if (!result.ok) return { fetched, cached, error: result }
      if (result.fromCache) cached += 1
      else fetched += 1
      saveSnapshot(result.data.data)
    }
    return { fetched, cached, error: null }
  }
)
