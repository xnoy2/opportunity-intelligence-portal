'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import CompanyBadge from '@/components/leads/CompanyBadge'
import ScoreBadge from '@/components/leads/ScoreBadge'
import ScoreFilter from '@/components/ui/ScoreFilter'
import { getMapLeads } from '@/lib/api'
import { fmtValueRange } from '@/lib/format'
import type { MapLead } from '@/types'

// Leaflet must be loaded client-side only — no SSR
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full animate-pulse items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

const COMPANIES: { key: string; label: string; dot: string }[] = [
  { key: 'all',      label: 'All',      dot: '' },
  { key: 'BGR',      label: 'BGR',      dot: 'bg-info' },
  { key: 'BWDS',     label: 'BWDS',     dot: 'bg-violet' },
  { key: 'BCF',      label: 'BCF',      dot: 'bg-success' },
  { key: 'MULTIPLE', label: 'Multiple', dot: 'bg-primary' },
]

export default function MapPage() {
  const [leads, setLeads]       = useState<MapLead[]>([])
  const [loading, setLoading]   = useState(true)
  const [company, setCompany]   = useState('all')
  const [minScore, setMinScore] = useState(0)
  const [selected, setSelected] = useState<MapLead | null>(null)

  useEffect(() => {
    getMapLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter(l => {
    if (company !== 'all' && l.assignedCompany !== company) return false
    if (l.leadScore < minScore) return false
    return true
  })

  return (
    <div className="flex h-screen flex-col">
      <Topbar title="Opportunity Map" subtitle="Geographic view of scored leads" />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3">
        <div className="flex flex-wrap gap-2">
          {COMPANIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCompany(c.key)}
              className={`state-layer inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${
                company === c.key
                  ? 'bg-primary-container text-primary-on-container'
                  : 'border border-outline text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.dot && <span className={`h-2 w-2 rounded-full ${c.dot}`} />}
              {c.label}
            </button>
          ))}
        </div>

        <ScoreFilter value={minScore} onChange={setMinScore} />

        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? 'Loading…' : `${filtered.length} plotted`}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="relative flex-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading leads…
            </div>
          ) : (
            <LeafletMap leads={filtered} onSelect={setSelected} />
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-border bg-card">
            <div className="flex items-start justify-between p-4">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Selected Lead</p>
                <p className="font-mono text-xs text-info">{selected.planningRef}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="state-layer flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-4 pt-0">
              <div className="flex items-center gap-3">
                <ScoreBadge score={selected.leadScore} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{selected.location}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <CompanyBadge company={selected.assignedCompany} />
                    <span className="text-xs text-muted-foreground">{selected.sourceRegion}</span>
                  </div>
                </div>
              </div>

              {selected.projectType && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Project Type</p>
                  <p className="text-sm text-foreground">{selected.projectType}</p>
                </div>
              )}

              {selected.estimatedValue && (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Est. Value</p>
                  <p className="font-medium text-primary">{fmtValueRange(selected.estimatedValue)}</p>
                </div>
              )}

              <a
                href={`/leads/${selected.id}`}
                className="state-layer flex h-10 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground shadow-e1 transition-shadow hover:shadow-e2"
              >
                View Full Lead
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
