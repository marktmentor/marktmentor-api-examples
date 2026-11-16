import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { notifyUsage } from "@/hooks/use-usage"
import { useI18n } from "@/i18n"
import { setTracked } from "@/api/tracked"
import { loadTrends } from "@/api/overview"
import type { Product } from "@/lib/types"

/**
 * Follow or unfollow a product. Following also loads its trend line for the
 * overview: one research request (or the cache), and the toast says so.
 */
export function useFollow() {
  const router = useRouter()
  const { m, fill } = useI18n()
  return async (p: Product, followed: boolean) => {
    await setTracked({ data: { product: p, tracked: !followed } })
    if (followed) {
      toast.success(m.products.unfollowed, { description: p.title })
    } else {
      const trend = await loadTrends({ data: { codes: [p.productCode] } })
      toast.success(m.products.followed, {
        description: trend.error
          ? fill(m.home.trendStopped, { code: trend.error.code })
          : trend.fetched
            ? m.home.trendLoaded
            : p.title,
      })
    }
    notifyUsage()
    await router.invalidate()
  }
}
