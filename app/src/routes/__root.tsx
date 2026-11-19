import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router"
import { FlaskConicalIcon } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { DemoExamples } from "@/components/demo-examples"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { UsageProvider, useUsage } from "@/hooks/use-usage"
import { I18nProvider, LOCALES, useI18n } from "@/i18n"
import { getLocale } from "@/i18n/server"
import { getQuotaNow } from "@/api/account"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  loader: async () => {
    const [locale, quota] = await Promise.all([getLocale(), getQuotaNow()])
    return { locale, ...quota }
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: LOCALES[loaderData?.locale ?? "en"].messages.meta.title },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootDocument,
  component: Layout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const data = Route.useLoaderData({
    select: (d) => d,
    structuralSharing: false,
  }) as { locale?: string } | undefined
  return (
    <html lang={data?.locale ?? "en"} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="theme">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function Layout() {
  return (
    <UsageProvider>
      <Shell />
    </UsageProvider>
  )
}

function Shell() {
  const loaded = Route.useLoaderData()
  const { locale, mode, reserve } = loaded
  // The root loader runs next to the page loader, so it misses the headers of
  // that page. The usage meter reads them again from the local log (no API call).
  const { data } = useUsage()
  const quota = data ? data.quota : loaded.quota
  const rates = data ? data.rates : loaded.rates
  const demo = mode === "demo"
  const usage = { quota, rates, reserve, demo }
  return (
    <I18nProvider locale={locale}>
      <TooltipProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "calc(var(--spacing) * 64)",
              "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
          }
        >
          <AppSidebar variant="inset" {...usage} />
          <SidebarInset>
            <SiteHeader demo={demo} usage={usage} />
            <main className="@container/main mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-6 px-4 py-4 md:py-6 lg:px-6">
              {demo && <DemoAlert />}
              <Outlet />
              <Footer />
            </main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </I18nProvider>
  )
}

function DemoAlert() {
  const { m } = useI18n()
  return (
    <Alert>
      <FlaskConicalIcon />
      <AlertTitle>{m.demo.title}</AlertTitle>
      <AlertDescription>
        <p>{m.demo.body}</p>
        <DemoExamples />
        <p className="text-xs">{m.demo.ownData}</p>
      </AlertDescription>
    </Alert>
  )
}

function Footer() {
  const { m } = useI18n()
  return (
    <p className="mt-auto pt-6 text-xs text-muted-foreground">{m.footer}</p>
  )
}
