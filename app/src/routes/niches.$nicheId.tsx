import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { getNicheDetail } from "@/api/niches"
import { getTrackedCodes } from "@/api/tracked"
import { ApiError } from "@/components/api-error"
import { MarketToggle } from "@/components/filters/market-toggle"
import { NicheKpis } from "@/components/niche/niche-kpis"
import { BackLink } from "@/components/research/back-link"
import { OptionSelect } from "@/components/research/period-select"
import { ResearchTabs } from "@/components/research/research-tabs"
import { SourceBadge } from "@/components/source-badge"
import { useI18n } from "@/i18n"
import { LIST_PERIODS } from "@/lib/filters"
import { loadNicheTab } from "./-niche/load-tab"
import {
  NICHE_TABS,
  NICHE_TAB_KEYS,
  type NicheSearch,
  parseNicheSearch,
} from "./-niche/search"
import { NicheTabPanel } from "./-niche/tab-panel"

export const Route = createFileRoute("/niches/$nicheId")({
  validateSearch: parseNicheSearch,
  loaderDeps: ({ search }) => search,
  // One request for the niche (with comparePeriods), plus the open tab only.
  loader: async ({ params: { nicheId: id }, deps: s }) => {
    const niche = await getNicheDetail({
      data: { id, market: s.market, period: s.period },
    })
    if (!niche.ok) return { niche, tab: null, tracked: new Set<string>() }
    const tracked = new Set(await getTrackedCodes())
    return { niche, tab: await loadNicheTab(id, s), tracked }
  },
  // No page skeleton: on a tab, filter or market change the page stays and
  // only the changed part shows that it loads. Visited URLs come from the
  // router cache for a minute.
  staleTime: 60_000,
  component: NichePage,
})

function NichePage() {
  const { niche, tab, tracked } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { m } = useI18n()
  const go = (patch: Partial<NicheSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), resetScroll: false })
  const back = <BackLink to="/niches" label={m.nav.niches} />
  if (!niche.ok || !tab) {
    return (
      <>
        {back}
        {!niche.ok && <ApiError error={niche} />}
      </>
    )
  }
  const n = niche.data.data
  const market = search.market ?? "ALL"

  return (
    <>
      {back}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{n.name}</h1>
          <SourceBadge result={niche} />
        </div>
        <div className="flex flex-wrap items-center gap-2 md:ml-auto">
          <MarketToggle
            value={market}
            onChange={(mk) =>
              go({ market: mk === "ALL" ? undefined : mk, page: undefined })
            }
          />
          <OptionSelect
            value={search.period ?? "30d"}
            options={LIST_PERIODS}
            labels={m.filters.periods}
            onChange={(p) =>
              go({ period: p === "30d" ? undefined : p, page: undefined })
            }
            className="w-32"
          />
        </div>
      </div>
      <NicheKpis niche={n} market={market} period={search.period ?? "30d"} />
      <ResearchTabs
        value={search.tab ?? "products"}
        tabs={NICHE_TABS.map((t) => ({ value: t, label: m.tabs[t] }))}
        onChange={(t) =>
          go({
            tab: t as NicheSearch["tab"],
            ...Object.fromEntries(NICHE_TAB_KEYS.map((k) => [k, undefined])),
          })
        }
      >
        <NicheTabPanel
          tab={tab}
          niche={n}
          search={search}
          tracked={tracked}
          go={go}
          onFilters={(f) =>
            navigate({ search: { ...f, tab: search.tab }, resetScroll: false })
          }
        />
      </ResearchTabs>
    </>
  )
}
