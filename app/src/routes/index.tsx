import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { OverviewKpis } from "@/components/overview/overview-kpis"
import { StoreSummary } from "@/components/overview/store-summary"
import { TrackedChart } from "@/components/overview/tracked-chart"
import { Suggestions } from "@/components/overview/suggestions"
import { TrackedList } from "@/components/overview/tracked-list"
import { PageHeader } from "@/components/page-header"
import { PageSkeleton } from "@/components/page-skeleton"
import { notifyUsage } from "@/hooks/use-usage"
import { useI18n } from "@/i18n"
import { productColors } from "@/lib/colors"
import { refreshTracked } from "@/api/tracked"
import { getOverview, loadTrends } from "@/api/overview"

export const Route = createFileRoute("/")({
  // Local data and the cache only, plus the free store summary.
  loader: () => getOverview(),
  pendingComponent: PageSkeleton,
  component: Overview,
})

function Overview() {
  const { products, store, suggestions } = Route.useLoaderData()
  const colors = productColors(products)
  const { m, fill } = useI18n()
  const router = useRouter()
  const [busy, setBusy] = useState<"trends" | "refresh" | null>(null)

  const run = async (kind: "trends" | "refresh") => {
    setBusy(kind)
    const result =
      kind === "trends"
        ? await loadTrends({ data: {} })
        : await refreshTracked()
    setBusy(null)
    notifyUsage()
    if (result.error)
      toast.error(fill(m.home.trendStopped, { code: result.error.code }))
    else
      toast.success(
        fill(kind === "trends" ? m.home.trendsLoaded : m.overview.refreshDone, {
          fetched: result.fetched,
          cached: result.cached,
        })
      )
    await router.invalidate()
  }

  return (
    <>
      <PageHeader title={m.home.title} description={m.home.description} />
      {products.length > 0 && <OverviewKpis products={products} />}
      <div className="grid gap-4 @5xl/main:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {products.length > 0 && (
          <TrackedChart products={products} colors={colors} />
        )}
        <StoreSummary result={store} />
      </div>
      {suggestions && <Suggestions suggestions={suggestions} />}
      <TrackedList
        products={products}
        colors={colors}
        busy={busy}
        onLoadTrends={() => run("trends")}
        onRefresh={() => run("refresh")}
      />
    </>
  )
}
