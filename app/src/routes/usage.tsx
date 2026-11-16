import { createFileRoute, useRouter } from "@tanstack/react-router"
import {
  CheckCircle2Icon,
  CircleXIcon,
  InfoIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/components/api-error"
import { PageHeader } from "@/components/page-header"
import { PageSkeleton } from "@/components/page-skeleton"
import { QuotaMeter } from "@/components/quota-card"
import { RateMeter } from "@/components/rate-meter"
import { RecentRequests } from "@/components/recent-requests"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useI18n } from "@/i18n"
import {
  clearLocalData,
  getQuotaNow,
  getRecentRequests,
  getStatus,
} from "@/api/account"

export const Route = createFileRoute("/usage")({
  loader: async () => ({
    status: await getStatus(),
    requests: await getRecentRequests(),
    limits: await getQuotaNow(),
  }),
  pendingComponent: PageSkeleton,
  component: UsagePage,
})

function UsagePage() {
  const { status, requests, limits } = Route.useLoaderData()
  const { m, fill, num } = useI18n()
  const router = useRouter()
  const [busy, setBusy] = useState<"clear" | null>(null)
  const demo = status.mode === "demo"
  const usage = status.usage
  const plan = usage.ok ? usage.data.plan : "unknown"

  const clear = async () => {
    setBusy("clear")
    await clearLocalData()
    setBusy(null)
    toast.success(m.overview.cleared)
    await router.invalidate()
  }

  return (
    <>
      <PageHeader
        title={m.usagePage.title}
        description={m.usagePage.description}
      />

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>{m.overview.connection}</CardDescription>
            <CardTitle className="text-2xl font-semibold break-words">
              {status.organizations.ok
                ? status.organizations.data[0]?.name
                : m.overview.notConnected}
            </CardTitle>
            <CardAction>
              {status.organizations.ok ? (
                <Badge variant="outline">
                  <CheckCircle2Icon />
                  {m.overview.connected}
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <CircleXIcon />
                  {m.overview.notConnected}
                </Badge>
              )}
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
            <span>
              {m.overview.mode}:{" "}
              {demo ? m.overview.modeDemo : m.overview.modeLive} ·{" "}
              {m.overview.api}: {status.baseUrl}
            </span>
            <span className="truncate">
              {m.overview.key}: {status.keyHint ?? m.overview.keyNone} ·{" "}
              {m.overview.keyServer}
            </span>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>{m.overview.plan}</CardDescription>
            <CardTitle className="text-2xl font-semibold">
              {m.overview.plans[plan]}
            </CardTitle>
          </CardHeader>
          <CardFooter>
            {plan === "unmetered" ? (
              <p className="text-sm text-muted-foreground">
                {m.usagePage.unmeteredNote}
              </p>
            ) : (
              <div className="flex w-full flex-col gap-2">
                <QuotaMeter
                  quota={status.quota}
                  reserve={status.reserve}
                  demo={demo}
                  detailed
                />
                {plan === "free" && (
                  <p className="text-xs text-muted-foreground">
                    {m.usagePage.freeNote}
                  </p>
                )}
              </div>
            )}
          </CardFooter>
        </Card>

        <Card className="@xl/main:col-span-2 @5xl/main:col-span-1">
          <CardHeader>
            <CardDescription>{m.overview.today}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {fill(m.overview.todayRequests, {
                n: num(status.researchToday.live),
              })}
            </CardTitle>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
            <span>
              {fill(m.overview.todayCached, {
                n: num(status.researchToday.cached),
              })}
            </span>
            <span>
              {fill(m.overview.localRows, {
                cache: num(status.localRows.cache),
                snapshots: num(status.localRows.snapshots),
              })}
            </span>
          </CardFooter>
        </Card>
      </div>

      {!status.organizations.ok && <ApiError error={status.organizations} />}
      {usage.ok && usage.data.plan === "none" && (
        <Alert>
          <InfoIcon />
          <AlertTitle>{m.overview.noResearchTitle}</AlertTitle>
          <AlertDescription>{m.overview.noResearchBody}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 @4xl/main:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="self-start">
          <CardHeader>
            <CardTitle>{m.usagePage.limits}</CardTitle>
            <CardDescription>{m.rate.tooltip}</CardDescription>
          </CardHeader>
          <CardContent>
            <RateMeter rates={limits.rates} showTitle={false} />
          </CardContent>
        </Card>
        <RecentRequests rows={requests} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{m.overview.local}</CardTitle>
          <CardDescription>
            {fill(m.usagePage.cacheBody, {
              cache: num(status.localRows.cache),
              snapshots: num(status.localRows.snapshots),
              requests: num(status.localRows.requests),
            })}{" "}
            {m.usagePage.cacheHint} {m.overview.localDescription}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={busy !== null}>
                {busy === "clear" ? <Spinner /> : <Trash2Icon />}
                {m.overview.clear}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{m.overview.clearTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {m.overview.clearBody}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{m.overview.cancel}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={clear}>
                  {m.overview.clearConfirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </>
  )
}
