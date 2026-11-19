// The free reference lookups: the bol category tree and the
// brand names. They cost no research request, work without a bundle and have
// their own limit of 120 per minute. The app keeps them for the data day.
import { createServerFn } from "@tanstack/react-start"
import { apiGet } from "@/server/client"
import { InputError, fields, text, whole } from "@/lib/input"
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
  .validator((input: { search?: string; parentId?: number }) => {
    const o = fields(input)
    return {
      search: text(o.search, 100),
      parentId: whole(o.parentId, 1, Number.MAX_SAFE_INTEGER),
    }
  })
  .handler(({ data }): Promise<ApiResult<CategoryList>> => {
    const search = data.search
    const params =
      search && search.length >= 2
        ? { search, pageSize: 50 }
        : data.parentId
          ? { parentId: data.parentId, pageSize: 200 }
          : { level: 1, pageSize: 200 }
    return apiGet<CategoryList>(
      "reference/categories/",
      params,
      (mm) => mm.reference.categories(params),
      { cache: true }
    )
  })

/** GET reference/categories/{categoryId}/: the name and path for a filter chip. */
export const getCategory = createServerFn({ method: "GET" })
  .validator((input: { categoryId: number }) => {
    // The id goes into the path: accept a positive whole number only.
    const categoryId = whole(
      fields(input).categoryId,
      1,
      Number.MAX_SAFE_INTEGER
    )
    if (categoryId === undefined)
      throw new InputError("categoryId is required.")
    return { categoryId }
  })
  .handler(({ data }) =>
    apiGet<{ data: Category }>(
      `reference/categories/${data.categoryId}/`,
      {},
      (mm) => mm.reference.category(data.categoryId),
      { cache: true }
    )
  )

/** GET reference/brands/: brand names with the text (at least 2 characters). */
export const findBrands = createServerFn({ method: "GET" })
  .validator((input: { search: string }) => {
    const search = text(fields(input).search, 100)
    if (!search || search.length < 2)
      throw new InputError("Search for at least 2 characters.")
    return { search }
  })
  .handler(({ data }): Promise<ApiResult<BrandList>> => {
    const params = { search: data.search, limit: 25 }
    return apiGet<BrandList>(
      "reference/brands/",
      params,
      (mm) => mm.reference.brands(params),
      { cache: true }
    )
  })
