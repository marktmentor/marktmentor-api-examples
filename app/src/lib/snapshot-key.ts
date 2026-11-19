/**
 * True when a cached research answer may feed a daily snapshot: both markets
 * and 30 days, so the days compare. The key is the cache key
 * (`<mode>:<path>?<sorted query>`). This holds in every mode: the test key
 * applies market and period too.
 */
export const isSnapshotKey = (key: string) =>
  /[?&]market=ALL(&|$)/.test(key) && /[?&]period=30d(&|$)/.test(key)
