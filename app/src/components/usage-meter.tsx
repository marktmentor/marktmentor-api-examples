import { Link } from "@tanstack/react-router"
import { ActivityIcon, OctagonAlertIcon } from "lucide-react"
import { QuotaMeter } from "@/components/quota-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useI18n } from "@/i18n"

import { RecentCalls } from "@/components/usage/recent-calls"
import {
  Counts,
  LastAction,
  StopLine,
  type UsageProps,
  useStop,
} from "@/components/usage/meter-parts"

/** The sidebar card: allowance, the cost of the last action, counters and stops. */
export function UsageMeter(props: UsageProps) {
  const { m } = useI18n()
  const stop = useStop(props)
  return (
    <Card size="sm" className="shadow-none">
      <CardContent className="flex flex-col gap-3">
        <Link to="/usage" className="block">
          <QuotaMeter
            quota={props.quota}
            reserve={props.reserve}
            demo={props.demo}
            stacked
          />
        </Link>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={m.ticker.open}
              className="-m-1 flex flex-col gap-1 rounded-md p-1 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-xs text-muted-foreground">
                {m.ticker.title}
              </span>
              {/* Fixed heights: a new action or a stop never moves anything. */}
              <span className="flex h-5 items-center">
                <StopLine {...props} />
                {!stop.atReserve && !stop.seconds && <LastAction />}
              </span>
              <span className="flex h-4 items-center">
                <Counts />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="end"
            className="w-96 max-w-[calc(100vw-2rem)]"
          >
            <RecentCalls />
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  )
}

/** The phone version in the header: the sidebar is hidden there. */
export function UsageMeterCompact(props: UsageProps) {
  const { m } = useI18n()
  const stop = useStop(props)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          aria-label={m.ticker.open}
        >
          {stop.atReserve || stop.seconds ? (
            <OctagonAlertIcon className="text-destructive" />
          ) : (
            <ActivityIcon />
          )}
          <LastAction compact />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <StopLine {...props} />
        <Counts />
        <RecentCalls />
      </PopoverContent>
    </Popover>
  )
}
