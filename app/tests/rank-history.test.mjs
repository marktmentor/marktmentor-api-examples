// The ranking table summary and the axis of its chart (src/lib/rank-history.ts).
import assert from "node:assert/strict"
import { test } from "node:test"
import { rankTicks, sortRows, summarize } from "../src/lib/rank-history.ts"

const row = (id, nl, be = []) => ({
  id,
  label: id,
  points: nl.map((v, i) => ({
    date: `2026-0${i + 1}-01`,
    positions: { NL: v, BE: be[i] ?? null },
  })),
})

test("now, best and change per market; a gap does not count", () => {
  const s = summarize(row("a", [8, null, 3, 5], [2, 2, 4, 6]))
  assert.deepEqual(s.now, { NL: 5, BE: 6 })
  assert.deepEqual(s.best, { NL: 3, BE: 2 })
  assert.deepEqual(s.change, { NL: 3, BE: -4 }, "8 to 5 is 3 places up")
  assert.equal(s.worst, 8)
  assert.equal(s.ranked, true)
})

test("a change below half a place is no change, not down 0", () => {
  // Averages as the API sends them: 4.2 to 4.5 (0.3 down), 7.6 to 7.4 (0.2 up).
  const s = summarize(row("k", [4.2, 4.5], [7.6, 7.4]))
  assert.deepEqual(s.change, { NL: 0, BE: 0 })
  assert.ok(Object.is(s.change.NL, 0), "not -0")
  assert.deepEqual(summarize(row("k", [4.2, 5.0])).change.NL, -1)
})

test("a row without positions is not ranked and goes last", () => {
  const rows = sortRows([
    row("none", [null, null]),
    row("b", [4]),
    row("a", [1]),
  ])
  assert.deepEqual(
    rows.map((r) => r.row.id),
    ["a", "b", "none"]
  )
  assert.equal(rows[2].summary.ranked, false)
  assert.equal(rows[2].summary.change.NL, null)
})

test("axis ticks: whole numbers from 1 to the worst position", () => {
  assert.deepEqual(rankTicks(3), [1, 2, 3])
  assert.deepEqual(rankTicks(1), [1, 2])
  assert.deepEqual(rankTicks(24), [1, 5, 10, 15, 20, 24])
  assert.deepEqual(rankTicks(21), [1, 5, 10, 15, 21], "no 20 just above 21")
  assert.deepEqual(rankTicks(2.4), [1, 2, 3])
})
