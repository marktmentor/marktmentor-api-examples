import { InfoIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { TabSkeleton } from "@/components/page-skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/i18n"

/**
 * shadcn Tabs as navigation: the open tab is in the URL, so the page loader
 * fetches only that tab (each tab is a research request).
 */
export function ResearchTabs({
  value,
  tabs,
  onChange,
  children,
  costHint,
}: {
  value: string
  tabs: { value: string; label: string }[]
  onChange: (value: string) => void
  children: React.ReactNode
  /** What a tab costs; research tabs by default. */
  costHint?: string
}) {
  const { m } = useI18n()
  // The tab you clicked is active at once. Only its panel shows a skeleton,
  // and only when the data takes longer than 150 ms (not from the cache).
  const [requested, setRequested] = useState<string | null>(null)
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (requested === null) return
    if (requested === value) {
      setRequested(null)
      setSlow(false)
      return
    }
    const id = setTimeout(() => setSlow(true), 150)
    return () => clearTimeout(id)
  }, [requested, value])
  return (
    <Tabs
      value={requested ?? value}
      onValueChange={(v) => {
        setRequested(v)
        onChange(v)
      }}
      className="min-w-0 gap-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="-mx-1 min-w-0 overflow-x-auto px-1">
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <Tooltip>
          <TooltipTrigger
            className="shrink-0 text-muted-foreground"
            aria-label={costHint ?? m.tabs.cost}
          >
            <InfoIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {costHint ?? m.tabs.cost}
          </TooltipContent>
        </Tooltip>
      </div>
      {slow ? <TabSkeleton /> : children}
    </Tabs>
  )
}
