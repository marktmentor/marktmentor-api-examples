import "@tanstack/react-start/server-only"

// Whose local data a request reads and writes. With your own key the app is
// yours alone: one owner, "live". In demo mode the app can be public (the
// hosted demo), so each browser gets its own id in a cookie and sees only
// its own followed products, snapshots and request log. The cache of API
// answers is shared: the test key gives every visitor the same answers.
import { randomUUID } from "node:crypto"
import {
  getCookie,
  getRequest,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server"
import { config } from "./config"
import { getDb } from "./db"

const COOKIE = "mm_demo_visitor"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// One id per request: a first visit makes the id once, also when the page
// loads several server functions in the same request.
const perRequest = new WeakMap<Request, string>()

function visitorId() {
  const request = getRequest()
  const known = perRequest.get(request)
  if (known) return known
  let id = getCookie(COOKIE)
  if (!id || !UUID.test(id)) {
    id = randomUUID()
    setCookie(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: getRequestProtocol() === "https",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  perRequest.set(request, id)
  // The last use, for the clean-up of demo visitors (server/retention.ts).
  getDb()
    .prepare(
      "insert into demo_visitors (owner, seen_at) values (?, ?) on conflict(owner) do update set seen_at = excluded.seen_at"
    )
    .run(`demo:${id}`, new Date().toISOString())
  return id
}

/** "live" with your own key; "demo:<id>" for each browser in demo mode. */
export function owner(): string {
  return config().mode === "live" ? "live" : `demo:${visitorId()}`
}
