import { useRouterState } from "@tanstack/react-router"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import type { ActionSummary } from "@/lib/ticker-core"
import { getUsageTicker, type UsageTicker } from "@/api/usage-ticker"

const EVENT = "mm:usage"
/** Safety net only: the meter updates after each navigation and each action. */
const POLL_MS = 10_000

/** Call after an action outside a route loader (follow, load trends). */
export function notifyUsage() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT))
}

type Usage = {
  data: UsageTicker | null
  /** The calls of the last action; seq changes on each new action (for the pulse). */
  last: (ActionSummary & { seq: number; reused: boolean }) | null
  session: number
}

const UsageContext = createContext<Usage>({
  data: null,
  last: null,
  session: 0,
})
export const useUsage = () => useContext(UsageContext)

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Usage>({
    data: null,
    last: null,
    session: 0,
  })
  const cursor = useRef<number | undefined>(undefined)
  const busy = useRef(false)
  const again = useRef(false)

  const navigated = useRef(false)
  const refresh = useCallback(async () => {
    if (busy.current) return void (again.current = true)
    busy.current = true
    try {
      const next = await getUsageTicker({ data: { since: cursor.current } })
      const a = next.action
      const any = a.cost + a.cache + a.free + a.failed > 0
      // A page change without any call reused data the page had already loaded.
      const reused = !any && navigated.current && cursor.current !== undefined
      navigated.current = false
      const first = cursor.current === undefined
      cursor.current = next.lastId
      setState((s) => ({
        data: next,
        last:
          !first && (any || reused)
            ? { ...a, reused, seq: (s.last?.seq ?? 0) + 1 }
            : s.last,
        session: s.session + a.cost,
      }))
    } catch {
      // The meter is a convenience: a failed local read must not break a page.
    } finally {
      busy.current = false
      if (again.current) {
        again.current = false
        void refresh()
      }
    }
  }, [])

  // After each navigation: filters, market, period and tabs are all loaders.
  const status = useRouterState({ select: (s) => s.status })
  const href = useRouterState({ select: (s) => s.resolvedLocation?.href })
  const seen = useRef(href)
  useEffect(() => {
    if (status !== "idle") return
    if (href !== seen.current) navigated.current = true
    seen.current = href
    const id = setTimeout(() => void refresh(), 100)
    return () => clearTimeout(id)
  }, [status, href, refresh])

  useEffect(() => {
    const onEvent = () => void refresh()
    window.addEventListener(EVENT, onEvent)
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, POLL_MS)
    return () => {
      window.removeEventListener(EVENT, onEvent)
      clearInterval(id)
    }
  }, [refresh])

  return <UsageContext.Provider value={state}>{children}</UsageContext.Provider>
}
