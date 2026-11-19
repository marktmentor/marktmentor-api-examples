// Which cached answers may feed a daily snapshot (src/lib/snapshot-key.ts).
import assert from "node:assert/strict"
import { test } from "node:test"
import { isSnapshotKey } from "../src/lib/snapshot-key.ts"

test("only both markets and 30 days, in live and in demo mode", () => {
  for (const mode of ["live", "demo"]) {
    const key = (q) => `${mode}:research/products/9300000138905032/?${q}`
    assert.equal(isSnapshotKey(key("market=ALL&period=30d")), true)
    assert.equal(isSnapshotKey(key("market=ALL&page=1&period=30d")), true)
    // The test key applies market and period: these answers are not daily totals.
    assert.equal(isSnapshotKey(key("market=NL&period=30d")), false)
    assert.equal(isSnapshotKey(key("market=ALL&period=90d")), false)
    assert.equal(isSnapshotKey(key("market=ALL&period=365d")), false)
    assert.equal(isSnapshotKey(key("page=1")), false)
  }
})
