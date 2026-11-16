// The one rule for changes (src/lib/change.ts).
import assert from "node:assert/strict"
import { test } from "node:test"
import { changeOf } from "../src/lib/change.ts"

test("a negative or zero previous value gives the absolute difference", () => {
  // A profit of 120 after a loss of 5: a percentage would be meaningless.
  assert.deepEqual(changeOf(120, -5, "money"), {
    type: "abs",
    diff: 125,
    previous: -5,
  })
  assert.equal(changeOf(10, 0, "money").type, "abs")
})

test("small counts give the absolute difference", () => {
  assert.deepEqual(changeOf(4, 1, "count"), {
    type: "abs",
    diff: 3,
    previous: 1,
  })
})

test("otherwise a percentage", () => {
  const c = changeOf(240, 200, "count")
  assert.equal(c.type, "pct")
  assert.equal(c.value, 20)
  assert.equal(changeOf(12000, 10000, "money").value, 20)
})

test("no previous value gives no change", () => {
  assert.equal(changeOf(5, null, "count"), null)
})

test("zero before and zero now gives no change", () => {
  assert.equal(changeOf(0, 0, "count"), null)
})
