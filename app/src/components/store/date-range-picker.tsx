import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useI18n } from "@/i18n"

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** startDate and endDate for store/products/ (shadcn Calendar in range mode). */
export function DateRangePicker({
  start,
  end,
  onChange,
}: {
  start?: string
  end?: string
  onChange: (range: { startDate?: string; endDate?: string }) => void
}) {
  const { m, fill, date } = useI18n()
  const [range, setRange] = useState<DateRange | undefined>(
    start && end ? { from: new Date(start), to: new Date(end) } : undefined
  )
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarIcon />
          {start && end
            ? fill(m.storeFilters.customRange, {
                start: date(start),
                end: date(end),
              })
            : m.storeFilters.range}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={range}
          onSelect={setRange}
          disabled={{ after: new Date() }}
          defaultMonth={range?.from}
        />
        <div className="flex flex-col gap-2 border-t p-3">
          <p className="max-w-sm text-xs text-muted-foreground">
            {m.storeFilters.rangeHint}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!range?.from || !range.to}
              onClick={() =>
                range?.from &&
                range.to &&
                onChange({ startDate: iso(range.from), endDate: iso(range.to) })
              }
            >
              {m.storeFilters.apply}
            </Button>
            {start && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange({ startDate: undefined, endDate: undefined })
                }
              >
                {m.storeFilters.clearRange}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
