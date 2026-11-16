import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { getProduct } from "@/api/products"
import { isTracked } from "@/api/tracked"
import { ApiError } from "@/components/api-error"
import { MarketToggle } from "@/components/filters/market-toggle"
import { ProductDetailsCard } from "@/components/product/details-card"
import { ProductHeader } from "@/components/product/product-header"
import { BackLink } from "@/components/research/back-link"
import { OptionSelect } from "@/components/research/period-select"
import { ResearchTabs } from "@/components/research/research-tabs"
import { useFollow } from "@/hooks/use-follow"
import { useI18n } from "@/i18n"
import { LIST_PERIODS } from "@/lib/filters"
import { loadProductTab } from "./-product/load-tab"
import {
  PRODUCT_TABS,
  type ProductSearch,
  type ProductTab,
  parseProductSearch,
} from "./-product/search"
import { ProductTabPanel } from "./-product/tab-panel"

export const Route = createFileRoute("/products/$productCode")({
  validateSearch: parseProductSearch,
  loaderDeps: ({ search }) => search,
  // One request for the product, plus the request(s) of the open tab only.
  loader: async ({ params: { productCode: code }, deps: s }) => {
    const product = await getProduct({
      data: { productCode: code, market: s.market ?? "ALL", period: s.dp },
    })
    const tracked = await isTracked({ data: { productCode: code } })
    if (!product.ok) return { product, tracked, tab: null }
    return { product, tracked, tab: await loadProductTab(code, s) }
  },
  // No page skeleton: on a tab, filter or market change the page stays and
  // only the changed part shows that it loads. Visited URLs come from the
  // router cache for a minute.
  staleTime: 60_000,
  component: ProductPage,
})

function ProductPage() {
  const { product, tracked, tab } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const follow = useFollow()
  const { m } = useI18n()
  const go = (patch: Partial<ProductSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false })
  const back = <BackLink to="/products" label={m.nav.products} />

  if (!product.ok || !tab) {
    return (
      <>
        {back}
        {!product.ok && <ApiError error={product} />}
      </>
    )
  }
  const p = product.data.data
  return (
    <>
      {back}
      <ProductHeader
        result={product}
        product={p}
        tracked={tracked}
        onToggle={() => follow(p, tracked)}
        controls={
          <>
            <MarketToggle
              value={search.market ?? "ALL"}
              onChange={(mk) =>
                go({ market: mk === "ALL" ? undefined : mk, page: undefined })
              }
            />
            <OptionSelect
              value={search.dp ?? "30d"}
              options={LIST_PERIODS}
              labels={m.filters.periods}
              onChange={(dp) => go({ dp: dp === "30d" ? undefined : dp })}
              className="w-32"
            />
          </>
        }
      />
      <ResearchTabs
        value={search.tab ?? "sales"}
        tabs={PRODUCT_TABS.map((t) => ({ value: t, label: m.tabs[t] }))}
        onChange={(t) => go({ tab: t as ProductTab, page: undefined })}
      >
        <ProductTabPanel tab={tab} product={p} search={search} go={go} />
      </ResearchTabs>
      <ProductDetailsCard product={p} />
    </>
  )
}
