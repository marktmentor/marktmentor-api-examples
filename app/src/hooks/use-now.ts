import { useEffect, useState } from "react"

/**
 * The current time, updated every second while `active` is true. It is null
 * during server rendering and the first client render, so both render the
 * same HTML (no hydration mismatch).
 */
export function useNow(active: boolean): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])
  return now
}
