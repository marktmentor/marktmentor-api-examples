// Server functions for followed products: kept in the local database, with
// one snapshot per day from answers the app already has.
import { createServerFn } from "@tanstack/react-start"
import type { Product, TrackedProduct } from "@/lib/types"
import { apiGet } from "@/server/client"
import { config } from "@/server/config"
import { getDb } from "@/server/db"
import { productFromCache, saveSnapshot } from "@/server/snapshots"

export const listTracked = createServerFn({ method: "GET" }).handler(
  async (): Promise<TrackedProduct[]> => {
    const mode = config().mode
    const db = getDb()
    const rows = db
      .prepare(
        "select product_code, ean, title, added_at from tracked_products where mode = ? order by added_at desc"
      )
      .all(mode) as {
      product_code: string
      ean: string | null
      title: string | null
      added_at: string
    }[]
    const snaps = db.prepare(
      "select day, market, price, sales, revenue from product_snapshots where mode = ? and product_code = ? order by day"
    )
    // A followed product without any snapshot yet: take one from today's
    // cached answers when they contain it (no request).
    for (const r of rows) {
      if (snaps.all(mode, r.product_code).length > 0) continue
      const cached = productFromCache(r.product_code)
      if (cached) saveSnapshot(cached)
    }
    return rows.map((r) => ({
      productCode: r.product_code,
      ean: r.ean,
      title: r.title,
      addedAt: r.added_at,
      snapshots: snaps.all(mode, r.product_code) as TrackedProduct["snapshots"],
    }))
  }
)

export const setTracked = createServerFn({ method: "POST" })
  .validator(
    (input: {
      product: Pick<Product, "productCode" | "ean" | "title" | "imageUrl">
      tracked: boolean
    }) => input
  )
  .handler(async ({ data }) => {
    const mode = config().mode
    const db = getDb()
    if (data.tracked) {
      db.prepare(
        "insert into tracked_products (mode, product_code, ean, title, image_url, added_at) values (?, ?, ?, ?, ?, ?) on conflict do nothing"
      ).run(
        mode,
        data.product.productCode,
        data.product.ean,
        data.product.title,
        data.product.imageUrl ?? null,
        new Date().toISOString()
      )
      // Today's snapshot right away, from an answer that is already in the
      // cache (a search, a niche list or the product page): no request.
      const cached = productFromCache(data.product.productCode)
      if (cached) saveSnapshot(cached)
    } else {
      db.prepare(
        "delete from tracked_products where mode = ? and product_code = ?"
      ).run(mode, data.product.productCode)
      db.prepare(
        "delete from product_snapshots where mode = ? and product_code = ?"
      ).run(mode, data.product.productCode)
    }
    return { ok: true }
  })

export const isTracked = createServerFn({ method: "GET" })
  .validator((input: { productCode: string }) => input)
  .handler(async ({ data }) =>
    Boolean(
      getDb()
        .prepare(
          "select 1 from tracked_products where mode = ? and product_code = ?"
        )
        .get(config().mode, data.productCode)
    )
  )

/** Refresh all tracked products: one research request each, at most once a day. */
export const refreshTracked = createServerFn({ method: "POST" }).handler(
  async () => {
    const mode = config().mode
    const codes = (
      getDb()
        .prepare("select product_code from tracked_products where mode = ?")
        .all(mode) as { product_code: string }[]
    ).map((r) => r.product_code)
    let fetched = 0
    let cached = 0
    for (const code of codes) {
      const result = await apiGet<{ data: Product }>(
        `research/products/${encodeURIComponent(code)}/`,
        { market: "ALL", period: "30d" }
      )
      if (!result.ok) return { fetched, cached, error: result }
      if (result.fromCache) cached += 1
      else fetched += 1
      saveSnapshot(result.data.data)
    }
    return { fetched, cached, error: null }
  }
)
