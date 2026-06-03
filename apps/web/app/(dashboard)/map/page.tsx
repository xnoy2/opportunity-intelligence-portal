'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import Topbar from '@/components/ui/Topbar'
import CompanyBadge from '@/components/leads/CompanyBadge'
import ScoreBadge from '@/components/leads/ScoreBadge'
import { getMapLeads } from '@/lib/api'
import type { MapLead, Company } from '@/types'

// Leaflet must be loaded client-side only — no SSR
const LeafletMap = dynamic(() => import('@/components/map/LeafletMap'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full text-muted text-sm animate-pulse">
    Loading map…
  </div>
)})

const COMPANIES: { key: string; label: string; color: string }[] = [
  { key: 'all',      label: 'All',      color: '' },
  { key: 'BGR',      label: 'BGR',      color: 'bg-accent' },
  { key: 'BWDS',     label: 'BWDS',     color: 'bg-purple-400' },
  { key: 'BCF',      label: 'BCF',      color: 'bg-success' },
  { key: 'MULTIPLE', label: 'Multiple', color: 'bg-gold' },
]

export default function MapPage() {
  const [leads, setLeads]         = useState<MapLead[]>([])
  const [loading, setLoading]     = useState(true)
  const [company, setCompany]     = useState('all')
  const [minScore, setMinScore]   = useState(0)
  const [selected, setSelected]   = useState<MapLead | null>(null)

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

  function fmtValue(n: number) {
    const lo = Math.round(n * 0.75 / 1000) * 1000
    const hi = Math.round(n * 1.4  / 1000) * 1000
    const f  = (v: number) => v >= 1000 ? `£${v / 1000}k` : `£${v}`
    return `${f(lo)}–${f(hi)}`
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Opportunity Map" />

      {/* Filter bar */}
      <div className="bg-navy-card border-b border-navy-border px-5 py-3 flex items-center gap-4 flex-wrap">
        <span className="text-muted text-sm">Filter:</span>

        {/* Company filter */}
        <div className="flex gap-1">
          {COMPANIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCompany(c.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                company === c.key
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'border-navy-border text-muted hover:text-white hover:border-white/30'
              }`}
            >
              {c.key !== 'all' && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${c.color}`} />}
              {c.label}
            </button>
          ))}
        </div>

        {/* Score filter */}
        <select
          value={minScore}
          onChange={e => setMinScore(Number(e.target.value))}
          className="bg-navy border border-navy-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold/50"
        >
          <option value={0}>Any score</option>
          <option value={70}>Score 70+</option>
          <option value={85}>Score 85+</option>
        </select>

        <span className="ml-auto text-muted text-xs">
          {loading ? 'Loading…' : `${filtered.length} plotted`}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted text-sm">
              Loading leads…
            </div>
          ) : (
            <LeafletMap leads={filtered} onSelect={setSelected} />
          )}
        </div>

        {/* Side panel — lead detail */}
        {selected && (
          <div className="w-72 bg-navy-card border-l border-navy-border overflow-y-auto flex-shrink-0">
            <div className="p-4 border-b border-navy-border flex items-start justify-between">
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-1">Selected Lead</p>
                <p className="text-accent font-mono text-xs">{selected.planningRef}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted hover:text-white text-lg leading-none"
              >×</button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className={`text-2xl font-bold ${selected.leadScore >= 85 ? 'text-gold' : selected.leadScore >= 70 ? 'text-warning' : 'text-muted'}`}>
                    {selected.leadScore}
                  </span>
                  <p className="text-muted text-[9px] uppercase">SCORE</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selected.location}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CompanyBadge company={selected.assignedCompany} />
                    <span className="text-muted text-xs">{selected.sourceRegion}</span>
                  </div>
                </div>
              </div>

              {selected.projectType && (
                <div>
                  <p className="text-muted text-xs uppercase tracking-wider mb-1">Project Type</p>
                  <p className="text-white text-sm">{selected.projectType}</p>
                </div>
              )}

              {selected.estimatedValue && (
                <div>
                  <p className="text-muted text-xs uppercase tracking-wider mb-1">Est. Value</p>
                  <p className="text-gold font-semibold">{fmtValue(selected.estimatedValue)}</p>
                </div>
              )}

              <a
                href={`/leads/${selected.id}`}
                className="block w-full bg-gold hover:bg-gold-dark text-navy text-sm font-bold text-center py-2.5 rounded-lg transition-colors"
              >
                View Full Lead →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
