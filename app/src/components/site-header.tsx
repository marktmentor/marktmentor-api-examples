import { useRouterState } from "@tanstack/react-router"
import { FlaskConicalIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { LanguageToggle } from "@/components/language-toggle"
import { ModeToggle } from "@/components/mode-toggle"
import { UsageMeterCompact } from "@/components/usage-meter"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useI18n } from "@/i18n"

export function SiteHeader({
  demo,
  usage,
}: {
  demo: boolean
  usage: React.ComponentProps<typeof UsageMeterCompact>
}) {
  const { m } = useI18n()
  // A small spinner while the page loads new data; the page itself stays.
  const pending = useRouterState({ select: (s) => s.status === "pending" })
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!pending) return setBusy(false)
    const id = setTimeout(() => setBusy(true), 200)
    return () => clearTimeout(id)
  }, [pending])
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" aria-label={m.meta.toggleSidebar} />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <span className="min-w-0 truncate text-base font-medium">
          {m.meta.title}
        </span>
        {demo && (
          <Badge variant="secondary" className="shrink-0">
            <FlaskConicalIcon />
            {m.demo.badge}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          {busy && (
            <Spinner
              className="mr-2 text-muted-foreground"
              aria-label={m.meta.loading}
            />
          )}
          <UsageMeterCompact {...usage} />
          <LanguageToggle />
          <ModeToggle />
        </div>
      </div>
    </header>
  )
}
