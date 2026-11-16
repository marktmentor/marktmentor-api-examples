// The page shell must not reload when you change a tab, a filter or the market.
// Pages whose content follows the URL search have no page-level skeleton
// (pendingComponent); only the tab panel shows one (TabSkeleton).
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src")
const read = (file) => readFileSync(path.join(src, file), "utf8")

const SEARCH_ROUTES = [
  "routes/products.index.tsx",
  "routes/products.$productCode.tsx",
  "routes/niches.index.tsx",
  "routes/niches.$nicheId.tsx",
  "routes/store.tsx",
]

test("pages driven by the URL search keep their shell while they load", () => {
  for (const file of SEARCH_ROUTES) {
    const code = read(file)
    assert.doesNotMatch(
      code,
      /pendingComponent/,
      `${file} replaces the whole page while it loads`
    )
    assert.match(
      code,
      /staleTime:\s*\d/,
      `${file} should keep visited URLs in the router cache`
    )
  }
})

test("only the tab panel shows a skeleton, after a short delay", () => {
  const tabs = read("components/research/research-tabs.tsx")
  assert.match(tabs, /TabSkeleton/)
  assert.match(tabs, /setTimeout\(\(\) => setSlow\(true\), \d+\)/)
})
