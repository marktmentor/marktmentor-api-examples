// One rule for every "change" in the app.
// A percentage is only shown when it means something: the previous value is
// above zero, and for counts at least 10. Otherwise the app shows the
// absolute difference with the previous value ("+€118, was €-5", "+3, was 1").

export type ChangeKind = "money" | "count"
export type Change =
  | { type: "pct"; value: number; diff: number }
  | { type: "abs"; diff: number; previous: number }

export const MIN_COUNT_FOR_PCT = 10

export function changeOf(
  current: number | null | undefined,
  previous: number | null | undefined,
  kind: ChangeKind
): Change | null {
  if (current == null || previous == null) return null
  const diff = current - previous
  // Nothing before and nothing now: no change to show.
  if (current === 0 && previous === 0) return null
  if (previous <= 0 || (kind === "count" && previous < MIN_COUNT_FOR_PCT))
    return { type: "abs", diff, previous }
  return { type: "pct", value: (diff / previous) * 100, diff }
}
