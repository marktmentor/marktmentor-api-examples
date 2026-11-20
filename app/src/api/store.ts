// Server functions for the store endpoints. Store requests are free, need no
// bundle (only a connected store) and are not cached: they change
// during the day.
import { createServerFn } from "@tanstack/react-start"
import { apiGet } from "@/server/client"
import { fields, isoDate, option, text, whole } from "@/lib/input"
import {
  STOCK_STATES,
  STORE_PAGE_SIZES,
  STORE_SORTS,
  type StockState,
  type StoreSort,
} from "@/lib/store-params"
import type { StoreInventory, StoreOverview, StoreProducts } from "@/lib/types"

export type StorePeriod = {
  days?: number
  startDate?: string
  endDate?: string
}
const COUNTRIES = ["NL", "BE"] as const

/** A page size of the store tables (lib/store-params.ts). */
function pageSize(v: unknown) {
  const size = option(STORE_PAGE_SIZES, v === undefined ? v : String(v))
  return size === undefined ? undefined : Number(size)
}

/** Use days, or startDate and endDate, never both (API rule). */
const period = (p: StorePeriod) =>
  p.startDate && p.endDate
    ? { startDate: p.startDate, endDate: p.endDate }
    : { days: p.days ?? 30 }

/** GET store/overview/ (days and country; no date range on this endpoint). */
export const getStoreOverview = createServerFn({ method: "GET" })
  .validator((input: { days?: number; country?: "NL" | "BE" }) => {
    const o = fields(input)
    return {
      days: whole(o.days, 1, 366),
      country: option(COUNTRIES, o.country),
    }
  })
  .handler(({ data }) => {
    const params = { days: data.days ?? 30, country: data.country }
    return apiGet<StoreOverview>("store/overview/", params, (mm) =>
      mm.store.overview(params)
    )
  })

export type StoreProductsQuery = StorePeriod & {
  country?: "NL" | "BE"
  /** The category number, as in research (reference/categories/). */
  categoryId?: number
  eans?: string
  sort?: StoreSort
  page?: number
  pageSize?: number
}

/** GET store/products/ with every parameter. */
export const getStoreProducts = createServerFn({ method: "GET" })
  .validator((input: StoreProductsQuery): StoreProductsQuery => {
    const o = fields(input)
    return {
      days: whole(o.days, 1, 366),
      startDate: isoDate(o.startDate),
      endDate: isoDate(o.endDate),
      country: option(COUNTRIES, o.country),
      categoryId: whole(o.categoryId, 1, Number.MAX_SAFE_INTEGER),
      // Typed text: the API checks the EANs and answers a clear 400.
      eans: text(o.eans, 1500),
      sort: option(STORE_SORTS, o.sort),
      page: whole(o.page, 1, 100),
      pageSize: pageSize(o.pageSize),
    }
  })
  .handler(({ data }) => {
    const params = {
      ...period(data),
      country: data.country,
      categoryId: data.categoryId,
      eans: data.eans,
      sort: data.sort ?? "-revenue",
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 25,
    }
    return apiGet<StoreProducts>("store/products/", params, (mm) =>
      mm.store.products(params)
    )
  })

/** GET store/inventory/ with every parameter. */
export const getStoreInventory = createServerFn({ method: "GET" })
  .validator(
    (input: {
      ean?: string
      stockState?: StockState
      page?: number
      pageSize?: number
    }) => {
      const o = fields(input)
      return {
        ean: text(o.ean, 14),
        stockState: option(STOCK_STATES, o.stockState),
        page: whole(o.page, 1, 100),
        pageSize: pageSize(o.pageSize),
      }
    }
  )
  .handler(({ data }) => {
    const params = {
      ean: data.ean,
      stockState: data.stockState,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 25,
    }
    return apiGet<StoreInventory>("store/inventory/", params, (mm) =>
      mm.store.inventory(params)
    )
  })
