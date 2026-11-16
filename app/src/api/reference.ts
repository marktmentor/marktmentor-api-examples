// The free reference lookups: the bol category tree and the
// brand names. They cost no research request, work without a bundle and have
// their own limit of 120 per minute. The app keeps them for the data day.
import { createServerFn } from "@tanstack/react-start"
import { apiGet } from "@/server/client"
import type { ApiResult, Pagination } from "@/lib/types"

export type Category = {
  categoryId: number
  name: string
  level: number
  parentId: number | null
  path: { categoryId: number; name: string }[]
  childCount: number
}
export type CategoryList = { data: Category[]; pagination: Pagination }
export type BrandList = { data: { name: string }[]; hasMore: boolean }

/** GET reference/categories/: search, or level 1, or the children of parentId. */
export const findCategories = createServerFn({ method: "GET" })
  .validator((input: { search?: string; parentId?: number }) => input)
  .handler(({ data }): Promise<ApiResult<CategoryList>> => {
    const search = data.search?.trim()
    return apiGet<CategoryList>(
      "reference/categories/",
      search && search.length >= 2
        ? { search, pageSize: 50 }
        : data.parentId
          ? { parentId: data.parentId, pageSize: 200 }
          : { level: 1, pageSize: 200 },
      { cache: true }
    )
  })

/** GET reference/categories/{categoryId}/: the name and path for a filter chip. */
export const getCategory = createServerFn({ method: "GET" })
  .validator((input: { categoryId: number }) => {
    // The id goes into the path: accept a positive whole number only.
    if (!Number.isInteger(input.categoryId) || input.categoryId < 1)
      throw new Error("categoryId must be a positive whole number")
    return input
  })
  .handler(({ data }) =>
    apiGet<{ data: Category }>(
      `reference/categories/${data.categoryId}/`,
      {},
      { cache: true }
    )
  )

/** GET reference/brands/: brand names with the text (at least 2 characters). */
export const findBrands = createServerFn({ method: "GET" })
  .validator((input: { search: string }) => input)
  .handler(({ data }): Promise<ApiResult<BrandList>> =>
    apiGet<BrandList>(
      "reference/brands/",
      { search: data.search.trim(), limit: 25 },
      { cache: true }
    )
  )
