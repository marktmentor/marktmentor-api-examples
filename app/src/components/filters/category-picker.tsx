import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
} from "lucide-react"
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
import { type Category, findCategories, getCategory } from "@/api/reference"
import { cn } from "@/lib/utils"

type Props = {
  value?: number
  onChange: (categoryId: number | undefined) => void
  id?: string
  className?: string
}

/**
 * Pick a bol category from the free reference/categories/ endpoint: search by
 * name, or browse from the top of the tree. Each lookup costs no research request.
 */
export function CategoryPicker({ value, onChange, id, className }: Props) {
  const { m, fill, num } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [parent, setParent] = useState<Category | null>(null)
  const [rows, setRows] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Category | null>(null)
  const q = useDebounced(search)

  // The name of the chosen category (for a value from the URL).
  useEffect(() => {
    if (!value) return setSelected(null)
    if (selected?.categoryId === value) return
    let cancelled = false
    void getCategory({ data: { categoryId: value } }).then((r) => {
      if (cancelled) return
      setSelected(r.ok ? r.data.data : null)
      notifyUsage()
    })
    return () => {
      cancelled = true
    }
  }, [value, selected?.categoryId])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setRows(null)
    void findCategories({
      data: {
        search: q.trim().length >= 2 ? q : undefined,
        parentId: parent?.categoryId,
      },
    }).then((r) => {
      if (cancelled) return
      setError(r.ok ? null : r.code)
      setRows(r.ok ? r.data.data : [])
      notifyUsage()
    })
    return () => {
      cancelled = true
    }
  }, [open, q, parent])

  const choose = (c: Category | null) => {
    setSelected(c)
    onChange(c?.categoryId)
    setOpen(false)
  }
  const searching = q.trim().length >= 2

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
          <span
            className={cn(
              "truncate",
              !selected && !value && "text-muted-foreground"
            )}
          >
            {selected
              ? selected.name
              : value
                ? fill(m.filters.chip.categoryId, { v: value })
                : m.reference.pickCategory}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={m.reference.searchCategory}
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
                  : m.reference.noCategories}
              </CommandEmpty>
            )}
            {rows !== null && (
              <CommandGroup
                heading={
                  searching
                    ? m.reference.results
                    : parent
                      ? parent.name
                      : m.reference.top
                }
              >
                {value !== undefined && !parent && !searching && (
                  <CommandItem onSelect={() => choose(null)}>
                    {m.reference.anyCategory}
                  </CommandItem>
                )}
                {parent && !searching && (
                  <>
                    <CommandItem onSelect={() => setParent(null)}>
                      <ChevronLeftIcon />
                      {m.reference.back}
                    </CommandItem>
                    <CommandItem onSelect={() => choose(parent)}>
                      {fill(m.reference.allOf, { name: parent.name })}
                    </CommandItem>
                  </>
                )}
                {rows.map((c) => (
                  <CommandItem
                    key={c.categoryId}
                    value={String(c.categoryId)}
                    onSelect={() => choose(c)}
                  >
                    <CheckIcon
                      className={cn(
                        value === c.categoryId ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{c.name}</span>
                      {searching && c.path.length > 1 && (
                        <span className="truncate text-xs text-muted-foreground">
                          {c.path
                            .slice(0, -1)
                            .map((p) => p.name)
                            .join(" › ")}
                        </span>
                      )}
                    </span>
                    {c.childCount > 0 && !searching && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={fill(m.reference.browse, {
                          name: c.name,
                          n: num(c.childCount),
                        })}
                        title={fill(m.reference.browse, {
                          name: c.name,
                          n: num(c.childCount),
                        })}
                        onClick={(e) => {
                          e.stopPropagation()
                          setParent(c)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <ChevronRightIcon />
                      </Button>
                    )}
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
