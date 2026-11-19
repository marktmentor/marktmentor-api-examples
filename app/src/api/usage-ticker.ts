// The usage meter in the sidebar. It reads the local request_log only: it
// never calls the MarktMentor API, so opening or watching it costs nothing.
import { createServerFn } from "@tanstack/react-start"
import { fields, whole } from "@/lib/input"
import { getQuota, getRates } from "@/server/limits"
import { config } from "@/server/config"
import { getDb } from "@/server/db"
import { owner } from "@/server/owner"
import {
  type CallKind,
  type LogRow,
  kindOf,
  summarize,
} from "@/lib/ticker-core"

export type TickerCall = LogRow & { kind: CallKind; retryAfter: number | null }

const COLUMNS = `id, at, path, status, research, from_cache as fromCache, retry_after as retryAfter`

export const getUsageTicker = createServerFn({ method: "GET" })
  .validator((input: { since?: number }) => ({
    since: whole(fields(input).since, 0, Number.MAX_SAFE_INTEGER),
  }))
  .handler(async ({ data }) => {
    const { mode, reserve } = config()
    const who = owner()
    const db = getDb()
    const withKind = (rows: (LogRow & { retryAfter: number | null })[]) =>
      rows.map((r) => ({ ...r, kind: kindOf(r) }))
    const lastId =
      (
        db
          .prepare("select max(id) id from request_log where owner = ?")
          .get(who) as { id: number | null }
      ).id ?? 0
    // The first read only sets the cursor: earlier calls are not "this action".
    const delta =
      data.since === undefined
        ? []
        : (db
            .prepare(
              `select ${COLUMNS} from request_log where owner = ? and id > ? order by id`
            )
            .all(who, data.since) as LogRow[])
    const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00`
    const today = summarize(
      db
        .prepare(
          "select research, from_cache as fromCache, status from request_log where owner = ? and at >= ?"
        )
        .all(who, dayStart) as LogRow[]
    )
    const recent = withKind(
      db
        .prepare(
          `select ${COLUMNS} from request_log where owner = ? order by id desc limit 8`
        )
        .all(who) as (LogRow & { retryAfter: number | null })[]
    )
    return {
      lastId,
      action: summarize(delta),
      today,
      recent,
      quota: getQuota() ?? null,
      rates: getRates(),
      reserve,
      mode,
    }
  })

export type UsageTicker = Awaited<ReturnType<typeof getUsageTicker>>
