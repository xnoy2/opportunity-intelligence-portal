'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { MapLead } from '@/types'

// Pin colours by company
const PIN_COLOURS: Record<string, string> = {
  BGR:      '#4A9EFF',   // blue
  BWDS:     '#C084FC',   // purple
  BCF:      '#3ECF8E',   // green
  MULTIPLE: '#C9A84C',   // gold
}
const DEFAULT_PIN = '#8B9AAD'  // grey

interface Props {
  leads:    MapLead[]
  onSelect: (lead: MapLead) => void
}

export default function LeafletMap({ leads, onSelect }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<import('leaflet').Map | null>(null)
  const layerRef      = useRef<import('leaflet').LayerGroup | null>(null)
  const onSelectRef   = useRef(onSelect)

  // Keep the latest onSelect without re-running effects
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // ─── Initialise the map ONCE ──────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    const init = async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current) return

      const map = L.map(containerRef.current, {
        center: [54.7, -6.7],   // centred on NI
        zoom:   8,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      // Layer group holds the markers — we clear/repopulate this on filter change
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current   = map

      // Critical: the container often isn't fully sized at init in a flex layout,
      // so Leaflet only loads tiles for a tiny area. invalidateSize forces a recalc.
      setTimeout(() => map.invalidateSize(), 100)

      // Plot initial markers
      renderMarkers(L, map)
    }

    init().catch(console.error)

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Sync markers whenever the filtered leads change ──────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false

    import('leaflet').then(({ default: L }) => {
      if (cancelled) return
      renderMarkers(L, map)
    })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads])

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
      <style>{`
        .leaflet-dark-tooltip {
          background: #131E2E;
          border: 1px solid #1E2D42;
          color: #fff;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .leaflet-dark-tooltip::before { display: none; }
        .leaflet-container { background: #0F1623; width: 100%; height: 100%; }
        .leaflet-control-zoom a {
          background: #131E2E !important;
          color: #fff !important;
          border-color: #1E2D42 !important;
        }
        .leaflet-control-zoom a:hover { background: #1A2640 !important; }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  )
}
