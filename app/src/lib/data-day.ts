/**
 * The data day of a cached research answer. The research data refreshes once
 * a day between 01:00 and 06:30 Dutch time (API guide), so a new data day
 * starts at 07:00 in Amsterdam: an answer fetched at 05:00 is not reused
 * after 07:00. Pure, so tests/data-day.test.mjs can check it.
 */
export function dataDay(now = new Date()): string {
  return new Date(now.getTime() - 7 * 3600_000).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Amsterdam",
  })
}
