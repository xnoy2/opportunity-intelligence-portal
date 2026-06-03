'use client'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<import('leaflet').Map | null>(null)
  const markersRef   = useRef<import('leaflet').CircleMarker[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    const init = async () => {
      const L = (await import('leaflet')).default

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
      })

      // Dark CartoDB tiles as spec'd
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map

      // Plot markers
      markersRef.current = leads.map(lead => {
        const colour = PIN_COLOURS[lead.assignedCompany ?? ''] ?? DEFAULT_PIN
        // Radius proportional to score (5–16px)
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
          { sticky: true, className: 'leaflet-dark-tooltip' }
        )

        marker.on('click', () => onSelect(lead))
        return marker
      })

      // Fit bounds if we have markers
      if (leads.length > 0) {
        const group = L.featureGroup(markersRef.current)
        map.fitBounds(group.getBounds().pad(0.1))
      }
    }

    init().catch(console.error)

    return () => {
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  // Re-render markers when leads or callback changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads])

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
        .leaflet-container { background: #0F1623; }
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
