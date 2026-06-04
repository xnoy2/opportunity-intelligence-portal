'use client'

import { useRef, useCallback } from 'react'

/**
 * Click-and-drag horizontal panning for an overflow-x container (e.g. a kanban board).
 * Grab any empty area and drag left/right. Drags started on interactive
 * elements (buttons, links, inputs) are ignored so card actions still work,
 * and per-column vertical scrolling is untouched.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 })

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, [draggable="true"]')) return
    drag.current = { active: true, startX: e.pageX, scrollLeft: el.scrollLeft }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [])

  const end = useCallback(() => {
    const el = ref.current
    drag.current.active = false
    if (el) { el.style.cursor = ''; el.style.userSelect = '' }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el || !drag.current.active) return
    e.preventDefault()
    el.scrollLeft = drag.current.scrollLeft - (e.pageX - drag.current.startX)
  }, [])

  return {
    ref,
    dragProps: { onMouseDown, onMouseMove, onMouseUp: end, onMouseLeave: end },
  }
}
