'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number from 0 up to `target` once on mount (and whenever target
 * changes), using requestAnimationFrame with an ease-out curve.
 * Respects prefers-reduced-motion (jumps straight to the value).
 */
export function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(0)
  const frame = useRef<number>()

  useEffect(() => {
    if (!Number.isFinite(target)) { setValue(target); return }

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || target === 0) { setValue(target); return }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(target * eased)
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else setValue(target)
    }
    frame.current = requestAnimationFrame(tick)

    return () => { if (frame.current) cancelAnimationFrame(frame.current) }
  }, [target, duration])

  return value
}
