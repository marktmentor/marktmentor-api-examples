// The cache day starts at 07:00 Dutch time (src/lib/data-day.ts).
import assert from "node:assert/strict"
import { test } from "node:test"
import { dataDay } from "../src/lib/data-day.ts"

test("before 07:00 in Amsterdam an answer belongs to the previous day", () => {
  // 14 Nov 05:00 CET = 04:00 UTC: the refresh of 14 Nov may not be done yet.
  assert.equal(dataDay(new Date("2026-11-14T04:00:00Z")), "2026-11-13")
  assert.equal(dataDay(new Date("2026-11-14T05:59:00Z")), "2026-11-13")
})

test("from 07:00 in Amsterdam a new data day starts (winter and summer time)", () => {
  assert.equal(dataDay(new Date("2026-11-14T06:00:00Z")), "2026-11-14") // 07:00 CET
  assert.equal(dataDay(new Date("2026-07-14T05:00:00Z")), "2026-07-14") // 07:00 CEST
  assert.equal(dataDay(new Date("2026-07-14T04:59:00Z")), "2026-07-13")
})
