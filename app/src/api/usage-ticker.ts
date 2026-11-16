// The usage meter in the sidebar. It reads the local request_log only: it
// never calls the MarktMentor API, so opening or watching it costs nothing.
import { createServerFn } from "@tanstack/react-start"
import { getQuota, getRates } from "@/server/limits"
import { config } from "@/server/config"
import { getDb } from "@/server/db"
import {
  type CallKind,
  type LogRow,
  kindOf,
  summarize,
} from "@/lib/ticker-core"

export type TickerCall = LogRow & { kind: CallKind; retryAfter: number | null }

const COLUMNS = `id, at, path, status, research, from_cache as fromCache, retry_after as retryAfter`

export const getUsageTicker = createServerFn({ method: "GET" })
  .validator((input: { since?: number }) => input)
  .handler(async ({ data }) => {
    const { mode, reserve } = config()
    const db = getDb()
    const withKind = (rows: (LogRow & { retryAfter: number | null })[]) =>
      rows.map((r) => ({ ...r, kind: kindOf(r) }))
    const lastId =
      (
        db
          .prepare("select max(id) id from request_log where mode = ?")
          .get(mode) as { id: number | null }
      ).id ?? 0
    // The first read only sets the cursor: earlier calls are not "this action".
    const delta =
      data.since === undefined
        ? []
        : (db
            .prepare(
              `select ${COLUMNS} from request_log where mode = ? and id > ? order by id`
            )
            .all(mode, data.since) as LogRow[])
    const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00`
    const today = summarize(
      db
        .prepare(
          "select research, from_cache as fromCache, status from request_log where mode = ? and at >= ?"
        )
        .all(mode, dayStart) as LogRow[]
    )
    const recent = withKind(
      db
        .prepare(
          `select ${COLUMNS} from request_log where mode = ? order by id desc limit 8`
        )
        .all(mode) as (LogRow & { retryAfter: number | null })[]
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
