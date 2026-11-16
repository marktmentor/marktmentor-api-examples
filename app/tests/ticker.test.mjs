// The usage meter rule (src/lib/ticker-core.ts) and its data source.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { summarize } from "../src/lib/ticker-core.ts"

const research = (fromCache, status = 200) => ({
  research: 1,
  fromCache,
  status,
})
const free = { research: 0, fromCache: 0, status: 200 }

test("a filter change answered from the cache costs 0", () => {
  assert.deepEqual(summarize([research(1)]), {
    cost: 0,
    cache: 1,
    free: 0,
    failed: 0,
    rateLimited: false,
  })
})

test("a new filter costs 1; a product tab with detail and reviews costs what went to the API", () => {
  assert.equal(summarize([research(0)]).cost, 1)
  assert.deepEqual(summarize([research(1), research(0), research(0)]), {
    cost: 2,
    cache: 1,
    free: 0,
    failed: 0,
    rateLimited: false,
  })
})

test("store and account calls are free, a 429 costs nothing and is flagged", () => {
  const s = summarize([free, free, research(0, 429)])
  assert.equal(s.cost, 0)
  assert.equal(s.free, 2)
  assert.equal(s.failed, 1)
  assert.equal(s.rateLimited, true)
})

test("the meter reads the local log only and never calls the MarktMentor API", () => {
  const dir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src"
  )
  const server = readFileSync(path.join(dir, "api/usage-ticker.ts"), "utf8")
  assert.doesNotMatch(
    server,
    /apiGet|fetch\(/,
    "usage-ticker.ts must not call the API"
  )
  assert.match(server, /request_log/)
})
