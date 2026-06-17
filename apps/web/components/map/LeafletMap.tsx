'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'
import type { MapLead } from '@/types'

// Pin colours by company — aligned to the slate/indigo palette
const PIN_COLOURS: Record<string, string> = {
  BGR:      '#0284C7',   // sky / info
  BWDS:     '#7C3AED',   // violet
  BCF:      '#059669',   // emerald / success
  MULTIPLE: '#4F46E5',   // indigo / primary
}
const DEFAULT_PIN = '#94A3B8'  // slate-400

interface Props {
  leads:    MapLead[]
  onSelect: (lead: MapLead) => void
}

export default function LeafletMap({ leads, onSelect }: Props) {
  const { theme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import('leaflet').Map | null>(null)
  const markersRef   = useRef<import('leaflet').CircleMarker[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    let resizeObs: ResizeObserver | undefined
    let rafId = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    // Set on cleanup so any deferred callback (raf/timeout/observer/zoom-end)
    // that fires after the map is destroyed bails out instead of touching a
    // removed map (which throws "_leaflet_pos of undefined").
    let cancelled = false

    const init = async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      // Fix Leaflet default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }

      const map = L.map(containerRef.current!, {
        center: [54.7, -6.7],   // centred on NI
        zoom:   8,
        zoomControl: true,
        // Disable zoom/fade animations entirely. With React StrictMode double
        // mounts (and theme re-inits), an in-flight zoom transition can fire
        // _onZoomTransitionEnd AFTER the map is destroyed, throwing
        // "_leaflet_pos of undefined". No animation = that listener never runs.
        zoomAnimation:       false,
        fadeAnimation:       false,
        markerZoomAnimation: false,
      })

      // CartoDB tiles — match the active theme
      const tileUrl = theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      L.tileLayer(tileUrl, {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      // Plot markers
      markersRef.current = leads.map(lead => {
        const colour = PIN_COLOURS[lead.assignedCompany ?? ''] ?? DEFAULT_PIN
        const radius = 5 + Math.round((lead.leadScore / 100) * 11)

        const marker = L.circleMarker([lead.latitude, lead.longitude], {
          radius,
          color:       colour,
          fillColor:   colour,
          fillOpacity: 0.85,
          weight:      1.5,
          opacity:     1,
        }).addTo(map)

        marker.bindTooltip(
          `<b>${lead.planningRef}</b><br>${lead.location ?? ''}<br>Score: ${lead.leadScore}`,
          { sticky: true, className: 'bcf-map-tooltip' }
        )

        marker.on('click', () => onSelect(lead))
        return marker
      })

      // Guard: the map may have been removed between scheduling and firing.
      const alive = () => !cancelled && mapRef.current === map && !!map.getContainer()

      const refit = () => {
        if (!alive() || markersRef.current.length === 0) return
        try {
          const group = L.featureGroup(markersRef.current)
          // animate:false avoids a zoom transition that, if it ends after the
          // map is destroyed, throws on the missing pane position.
          map.fitBounds(group.getBounds().pad(0.1), { animate: false })
        } catch (err) {
          console.warn('[map] fitBounds skipped:', err)
        }
      }
      refit()

      // The container is often 0×0 at init inside a flex/dynamic layout, which
      // leaves the SVG marker overlay invisible. Recompute size once mounted,
      // and whenever the container resizes.
      const fixSize = () => { if (!alive()) return; map.invalidateSize(); refit() }
      rafId = requestAnimationFrame(fixSize)
      timeoutId = setTimeout(fixSize, 200)

      if (containerRef.current) {
        resizeObs = new ResizeObserver(() => { if (alive()) map.invalidateSize() })
        resizeObs.observe(containerRef.current)
      }
    }

    init().catch(console.error)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      if (timeoutId) clearTimeout(timeoutId)
      resizeObs?.disconnect()
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  // Re-render when leads or theme change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, theme])

  return (
    <>
      {/* Theme-aware styling via CSS variables */}
      <style>{`
        .bcf-map-tooltip {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
        }
        .bcf-map-tooltip::before { display: none; }
        .leaflet-container { background: hsl(var(--background)); }
        .leaflet-control-zoom a {
          background: hsl(var(--card)) !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
        .leaflet-control-zoom a:hover { background: hsl(var(--accent)) !important; }
      `}</style>
      <div ref={containerRef} className="h-full w-full" />
    </>
  )
}
