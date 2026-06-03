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

  // Keep the latest onSelect without re-running effects
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // ─── Initialise the map ONCE ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    let resizeObs: ResizeObserver | undefined

    const init = async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [54.7, -6.7],   // centred on NI
        zoom:   8,
        zoomControl: true,
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

      // Layer group holds the markers — we clear/repopulate this on filter change
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current   = map

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

      const refit = () => {
        if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current)
          map.fitBounds(group.getBounds().pad(0.1))
        }
      }
      refit()

      // The container is often 0×0 at init inside a flex/dynamic layout, which
      // leaves the SVG marker overlay invisible. Recompute size once mounted,
      // and whenever the container resizes.
      const fixSize = () => { map.invalidateSize(); refit() }
      requestAnimationFrame(fixSize)
      setTimeout(fixSize, 200)

      if (containerRef.current) {
        resizeObs = new ResizeObserver(() => map.invalidateSize())
        resizeObs.observe(containerRef.current)
      }
    }

    init().catch(console.error)

    return () => {
      resizeObs?.disconnect()
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
    }
  // Re-render when leads or theme change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, theme])

  // ─── Marker rendering helper ──────────────────────────────────────────────
  function renderMarkers(L: typeof import('leaflet'), map: import('leaflet').Map) {
    const layer = layerRef.current
    if (!layer) return

    layer.clearLayers()

    const markers = leads.map(lead => {
      const colour = PIN_COLOURS[lead.assignedCompany ?? ''] ?? DEFAULT_PIN
      const radius = 5 + Math.round((lead.leadScore / 100) * 11)

      const marker = L.circleMarker([lead.latitude, lead.longitude], {
        radius,
        color:       colour,
        fillColor:   colour,
        fillOpacity: 0.85,
        weight:      1.5,
        opacity:     1,
      })

      marker.bindTooltip(
        `<b>${lead.planningRef}</b><br>${lead.location ?? ''}<br>Score: ${lead.leadScore}`,
        { sticky: true, className: 'leaflet-dark-tooltip' }
      )
      marker.on('click', () => onSelectRef.current(lead))
      layer.addLayer(marker)
      return marker
    })

    // Recalculate size first (handles container growth / side-panel open/close),
    // then fit to the markers — capped so a single far-flung pin doesn't zoom to street level.
    map.invalidateSize()
    if (markers.length > 0) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 13 })
    }
  }

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
