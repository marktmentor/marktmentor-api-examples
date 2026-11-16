import { useEffect, useRef, useState } from "react"

/** A number that rises to `value` in 400 ms; jumps at once with reduced motion. */
export function useCountUp(value: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    from.current = value
    if (start === value) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return setShown(value)
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min((t - t0) / 400, 1)
      setShown(Math.round(start + (value - start) * p))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}
