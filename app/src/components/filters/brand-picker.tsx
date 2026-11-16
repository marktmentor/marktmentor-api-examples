import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { useDebounced } from "@/hooks/use-debounced"
import { notifyUsage } from "@/hooks/use-usage"
import { useI18n } from "@/i18n"
import { findBrands } from "@/api/reference"
import { cn } from "@/lib/utils"

type Props = {
  value?: string
  onChange: (brand: string | undefined) => void
  id?: string
  className?: string
}

/**
 * Pick a brand from the free reference/brands/ endpoint. The brand filter is
 * an exact match, so the app sends the name exactly as this list gives it.
 */
export function BrandPicker({ value, onChange, id, className }: Props) {
  const { m, fill } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<string[] | null>([])
  const [more, setMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const q = useDebounced(search.trim())

  useEffect(() => {
    if (!open || q.length < 2) return setRows([])
    let cancelled = false
    setRows(null)
    void findBrands({ data: { search: q } }).then((r) => {
      if (cancelled) return
      setError(r.ok ? null : r.code)
      setRows(r.ok ? r.data.data.map((b) => b.name) : [])
      setMore(r.ok && r.data.hasMore)
      notifyUsage()
    })
    return () => {
      cancelled = true
    }
  }, [open, q])

  const choose = (name: string | undefined) => {
    onChange(name)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal", className)}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ?? m.reference.pickBrand}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={m.reference.searchBrand}
          />
          <CommandList>
            {rows === null && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}
            {rows !== null && (
              <CommandEmpty>
                {error
                  ? fill(m.reference.failed, { code: error })
                  : q.length < 2
                    ? m.reference.typeTwo
                    : m.reference.noBrands}
              </CommandEmpty>
            )}
            {value && (
              <CommandGroup>
                <CommandItem onSelect={() => choose(undefined)}>
                  {m.reference.anyBrand}
                </CommandItem>
              </CommandGroup>
            )}
            {rows !== null && rows.length > 0 && (
              <CommandGroup
                heading={more ? m.reference.moreBrands : m.reference.results}
              >
                {rows.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => choose(name)}
                  >
                    <CheckIcon
                      className={cn(
                        value === name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            {m.reference.free}
          </p>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
