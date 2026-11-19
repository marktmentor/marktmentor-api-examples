// Checks for the input of server functions. A server function is an HTTP
// endpoint that any browser can call: the TypeScript type of its input is not
// a check. Each validator reads the input with these helpers and throws on a
// value that the server must not use (a wrong id in a path, an unknown option).

import {
  LIST_PERIODS,
  MARKETS,
  type NicheFilters,
  type ProductFilters,
  parseNicheFilters,
  parseProductFilters,
} from "./filters"
import { INTERVALS, PERIODS, type ReviewQuery } from "./research-params"

export class InputError extends Error {}

/** The input as an object with named fields. */
export function fields(input: unknown): Record<string, unknown> {
  if (input === undefined || input === null) return {}
  if (typeof input !== "object" || Array.isArray(input))
    throw new InputError("The input must be an object.")
  return input as Record<string, unknown>
}

const PRODUCT_CODE = /^(?:\d{1,20}|ean:\d{8,14})$/

/** A bol product code, or `ean:` with an EAN (API docs: product path). */
export function productCode(v: unknown): string {
  if (typeof v !== "string" || !PRODUCT_CODE.test(v))
    throw new InputError("Not a product code.")
  return v
}

/** A niche id: a positive whole number, as text (it comes from the URL). */
export function nicheId(v: unknown): string {
  const id = typeof v === "number" ? String(v) : v
  if (typeof id !== "string" || !/^[1-9]\d{0,11}$/.test(id))
    throw new InputError("Not a niche id.")
  return id
}

/** One of the given options, or undefined when the value is not given. */
export function option<T extends string>(
  list: readonly T[],
  v: unknown
): T | undefined {
  if (v === undefined || v === null || v === "") return undefined
  if (!list.includes(v as T)) throw new InputError(`Unknown option: ${v}`)
  return v as T
}

/** One of the given options; it must be given. */
export function required<T extends string>(list: readonly T[], v: unknown): T {
  const value = option(list, v)
  if (value === undefined) throw new InputError("A required option is missing.")
  return value
}

/** A whole number from min to max, or undefined when not given. */
export function whole(v: unknown, min: number, max: number) {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number(v)
  if (!Number.isInteger(n) || n < min || n > max)
    throw new InputError(`A whole number from ${min} to ${max} is required.`)
  return n
}

/** Text of at most `max` characters, trimmed; undefined when empty. */
export function text(v: unknown, max = 200) {
  if (v === undefined || v === null) return undefined
  if (typeof v !== "string") throw new InputError("Text is required.")
  const value = v.trim()
  if (value.length > max) throw new InputError("The text is too long.")
  return value === "" ? undefined : value
}

/** A date as YYYY-MM-DD, or undefined when not given. */
export function isoDate(v: unknown) {
  const value = text(v, 10)
  if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new InputError("A date must be YYYY-MM-DD.")
  return value
}

/** true, or undefined (a flag that is off is left out of the query). */
export function flag(v: unknown) {
  if (v === undefined || v === null || v === false) return undefined
  if (v !== true) throw new InputError("A flag must be true or false.")
  return true as const
}

/** A list of product codes, at most `max`. */
export function productCodes(v: unknown, max: number) {
  if (v === undefined) return undefined
  if (!Array.isArray(v) || v.length > max)
    throw new InputError(`A list of at most ${max} product codes is required.`)
  return v.map(productCode)
}

// Composite inputs of the research and store server functions.

const REVIEW_SORTS = ["date", "-date", "score", "-score"] as const

/** Product or niche list filters: the same rules as the URL (lib/filters.ts). */
export const productFilters = (v: unknown): ProductFilters =>
  parseProductFilters(fields(v))
export const nicheFilters = (v: unknown): NicheFilters =>
  parseNicheFilters(fields(v))

/** market and period of a list or detail call. */
export function listScope(o: Record<string, unknown>) {
  return {
    market: option(MARKETS, o.market),
    period: option(LIST_PERIODS, o.period),
  }
}

/** period, interval and market of a history endpoint. */
export function historyScope(o: Record<string, unknown>) {
  return {
    period: required(PERIODS, o.period),
    interval: required(INTERVALS, o.interval),
    market: option(MARKETS, o.market),
  }
}

/** The filters of a review list (lib/research-params.ts ReviewQuery). */
export function reviewQuery(o: Record<string, unknown>): ReviewQuery {
  return {
    period: option(PERIODS, o.period),
    page: whole(o.page, 1, 1000),
    score: whole(o.score, 1, 5),
    verified: flag(o.verified),
    sort: option(REVIEW_SORTS, o.sort),
    search: text(o.search),
    ownOnly: flag(o.ownOnly),
  }
}
