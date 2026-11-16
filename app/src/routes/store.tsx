import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ApiError } from "@/components/api-error"
import { PageHeader } from "@/components/page-header"
import { OptionSelect } from "@/components/research/period-select"
import { ResearchTabs } from "@/components/research/research-tabs"
import { SourceBadge } from "@/components/source-badge"
import { DateRangePicker } from "@/components/store/date-range-picker"
import { StoreInventoryTab } from "@/components/store/store-inventory-tab"
import { StoreKpis } from "@/components/store/store-kpis"
import { StoreProductsTab } from "@/components/store/store-products-tab"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useI18n } from "@/i18n"
import {
  STOCK_STATES,
  type StockState,
  STORE_SORTS,
  type StoreSort,
} from "@/lib/store-params"
import {
  getStoreInventory,
  getStoreOverview,
  getStoreProducts,
} from "@/api/store"

const DAYS = ["7", "30", "90", "365"] as const
const TABS = ["products", "stock"] as const
type Search = {
  tab?: (typeof TABS)[number]
  days?: number
  country?: "NL" | "BE"
  startDate?: string
  endDate?: string
  categoryId?: number
  eans?: string
  sort?: StoreSort
  page?: number
  pageSize?: number
  ean?: string
  stockState?: StockState
}
const pick = <T extends string>(list: readonly T[], v: unknown) =>
  list.includes(v as T) ? (v as T) : undefined
const day = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
const text = (v: unknown) =>
  v !== undefined && v !== "" ? String(v) : undefined

export const Route = createFileRoute("/store")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const start = day(s.startDate)
    const end = day(s.endDate)
    return {
      tab: pick(TABS, s.tab),
      days: DAYS.includes(String(s.days) as (typeof DAYS)[number])
        ? Number(s.days)
        : undefined,
      country: pick(["NL", "BE"] as const, s.country),
      // Only both dates together.
      startDate: start && end ? start : undefined,
      endDate: start && end ? end : undefined,
      categoryId: Number(s.categoryId) > 0 ? Number(s.categoryId) : undefined,
      eans: text(s.eans),
      sort: pick(STORE_SORTS, s.sort),
      page: Number(s.page) > 1 ? Math.min(Number(s.page), 100) : undefined,
      pageSize: [5, 10, 50, 100].includes(Number(s.pageSize))
        ? Number(s.pageSize)
        : undefined,
      ean: text(s.ean),
      stockState: pick(STOCK_STATES, s.stockState),
    }
  },
  loaderDeps: ({ search }) => search,
  // Store requests are free: the overview and the open tab.
  loader: async ({ deps: s }) => {
    const overview = await getStoreOverview({
      data: { days: s.days, country: s.country },
    })
    if (!overview.ok) return { overview, tab: null }
    const tab =
      (s.tab ?? "products") === "products"
        ? {
            kind: "products" as const,
            result: await getStoreProducts({ data: s }),
          }
        : {
            kind: "stock" as const,
            result: await getStoreInventory({
              data: {
                ean: s.ean,
                stockState: s.stockState,
                page: s.page,
                pageSize: s.pageSize,
              },
            }),
          }
    return { overview, tab }
  },
  // No page skeleton: on a tab, filter or market change the page stays and
  // only the changed part shows that it loads. Visited URLs come from the
  // router cache for a minute.
  staleTime: 60_000,
  component: Store,
})

function Store() {
  const { overview, tab } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { m, fill, date } = useI18n()
  const go = (patch: Partial<Search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false })

  return (
    <>
      <PageHeader title={m.store.title} description={m.store.description}>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={search.country ?? "ALL"}
          onValueChange={(v) =>
            v &&
            go({
              country: v === "ALL" ? undefined : (v as "NL" | "BE"),
              page: undefined,
            })
          }
          aria-label={m.storeFilters.country}
        >
          {(["ALL", "NL", "BE"] as const).map((c) => (
            <ToggleGroupItem key={c} value={c} className="px-3">
              {m.storeFilters.countries[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <OptionSelect
          value={String(search.days ?? 30) as (typeof DAYS)[number]}
          options={DAYS}
          labels={m.store.days}
          onChange={(d) =>
            go({
              days: d === "30" ? undefined : Number(d),
              startDate: undefined,
              endDate: undefined,
              page: undefined,
            })
          }
          className="w-44"
        />
        <DateRangePicker
          start={search.startDate}
          end={search.endDate}
          onChange={(r) => go({ ...r, page: undefined, tab: "products" })}
        />
      </PageHeader>
      {!overview.ok || !tab ? (
        !overview.ok && <ApiError error={overview} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {fill(m.store.range, {
              start: date(overview.data.period.startDate),
              end: date(overview.data.period.endDate),
            })}
            <SourceBadge result={overview} free />
          </div>
          <StoreKpis overview={overview.data} />
          <ResearchTabs
            value={search.tab ?? "products"}
            tabs={TABS.map((t) => ({
              value: t,
              label: t === "products" ? m.store.productsTab : m.store.stockTab,
            }))}
            onChange={(t) =>
              go({
                tab: t as Search["tab"],
                page: undefined,
                pageSize: undefined,
              })
            }
            costHint={m.storeFilters.free}
          >
            {tab.kind === "products" && (
              <StoreProductsTab
                result={tab.result}
                query={search}
                onQuery={(q) => go(q)}
              />
            )}
            {tab.kind === "stock" && (
              <StoreInventoryTab
                result={tab.result}
                query={search}
                onQuery={(q) => go(q)}
              />
            )}
          </ResearchTabs>
        </>
      )}
    </>
  )
}
