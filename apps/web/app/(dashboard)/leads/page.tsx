'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Topbar from '@/components/ui/Topbar'
import CompanyBadge from '@/components/leads/CompanyBadge'
import ScoreFilter from '@/components/ui/ScoreFilter'
import { getLeads } from '@/lib/api'
import type { Lead, LeadCategory } from '@/types'

const TABS: { key: LeadCategory; label: string; icon: string }[] = [
  { key: 'all',        label: 'All Leads',  icon: '◎' },
  { key: 'approved',   label: 'Approved',   icon: '✓' },
  { key: 'high_value', label: 'High Value', icon: '◈' },
  { key: 'tourism',    label: 'Tourism',    icon: '✈' },
  { key: 'commercial', label: 'Commercial', icon: '◆' },
]

function fmtValue(n: number) {
  const lo = Math.round(n * 0.75 / 1000) * 1000
  const hi = Math.round(n * 1.4  / 1000) * 1000
  const f  = (v: number) => v >= 1000 ? `£${v / 1000}k` : `£${v}`
  return `${f(lo)}–${f(hi)}`
}

const ACTIONED = new Set(['CONTACTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'WON', 'LOST'])

function CategoryBadge({ projectType, dateApproved, score }: { projectType: string | null; dateApproved: string | null; score: number }) {
  if (dateApproved) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-success/40 bg-success/10 text-success font-medium">✓ Approved</span>
  )
  if (score >= 85) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-warning/40 bg-warning/10 text-warning font-medium">◈ High Value Pending</span>
  )
  const pt = (projectType ?? '').toLowerCase()
  if (pt.includes('tourism') || pt.includes('holiday') || pt.includes('glamping') || pt.includes('pod')) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent font-medium">✈ Tourism</span>
  )
  if (pt.includes('commercial') || pt.includes('office') || pt.includes('retail')) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-purple-400/40 bg-purple-400/10 text-purple-400 font-medium">◆ Commercial</span>
  )
  return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-navy-border bg-white/5 text-muted font-medium">Pending</span>
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="flex items-center gap-4 px-5 py-4 border-b border-navy-border hover:bg-navy-hover transition-colors cursor-pointer">
        <div className="flex-shrink-0 w-12 text-center">
          <span className={`text-2xl font-bold ${lead.leadScore >= 85 ? 'text-gold' : lead.leadScore >= 70 ? 'text-warning' : 'text-muted'}`}>
            {lead.leadScore}
          </span>
          <p className="text-muted text-[9px] uppercase tracking-wider">SCORE</p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryBadge projectType={lead.projectType} dateApproved={lead.dateApproved} score={lead.leadScore} />
          </div>
          <p className="text-white text-sm font-medium truncate">{lead.location ?? lead.planningRef}</p>
          <p className="text-muted text-xs mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{lead.planningRef}</span>
            {lead.sourceRegion && <span>· {lead.sourceRegion}</span>}
            {lead.assignedCompany && <CompanyBadge company={lead.assignedCompany} />}
          </p>
        </div>

        <div className="flex-shrink-0 text-right">
          {lead.estimatedValue ? (
            <p className="text-gold text-sm font-semibold">{fmtValue(lead.estimatedValue)}</p>
          ) : (
            <p className="text-muted text-xs">—</p>
          )}
          <span className="text-muted text-xs mt-1 block">▾</span>
        </div>
      </div>
    </Link>
  )
}

export default function LeadsPage() {
  const [leads, setLeads]           = useState<Lead[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<LeadCategory>('all')
  const [showActioned, setShowActioned] = useState(false)
  const [minScore, setMinScore]     = useState(0)
  const [offset, setOffset]         = useState(0)
  const LIMIT = 50

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      const filters: Record<string, unknown> = { limit: LIMIT, offset: off }
      if (tab !== 'all') filters.category = tab
      if (!showActioned) filters.unactioned = true
      if (minScore > 0) filters.minScore = minScore
      const res = await getLeads(filters)
      setLeads(res.leads)
      setTotal(res.total)
      setOffset(off)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [tab, showActioned, minScore])

  useEffect(() => { load(0) }, [load])

  const actioned = leads.filter(l => ACTIONED.has(l.status)).length
  const displayed = showActioned ? leads : leads.filter(l => !ACTIONED.has(l.status))

  return (
    <div>
      <Topbar title="Leads" />

      <div className="p-6">
        <div className="bg-navy-card border border-navy-border rounded-lg overflow-hidden">
          {/* Tabs + toggle */}
          <div className="flex items-center gap-1 px-5 pt-4 border-b border-navy-border overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  tab === t.key
                    ? 'border-gold text-gold'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}

            {/* Score filter + Show actioned toggle */}
            <div className="ml-auto flex items-center gap-3 pb-2.5 whitespace-nowrap">
              <ScoreFilter value={minScore} onChange={setMinScore} />
              <span className="text-muted text-xs">Show actioned</span>
              <button
                onClick={() => setShowActioned(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${showActioned ? 'bg-gold' : 'bg-navy-border'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${showActioned ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* Count line */}
          <div className="px-5 py-3 border-b border-navy-border">
            <p className="text-muted text-xs">
              Showing {displayed.length} lead{displayed.length !== 1 ? 's' : ''}
              {!showActioned && <span> · unactioned only</span>}
              {showActioned && actioned > 0 && <span> · {actioned} actioned</span>}
            </p>
          </div>

          {/* Lead cards */}
          {loading ? (
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-navy-border animate-pulse">
                  <div className="w-12 h-10 bg-navy-border rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-navy-border rounded w-24" />
                    <div className="h-4 bg-navy-border rounded w-3/4" />
                    <div className="h-3 bg-navy-border rounded w-1/2" />
                  </div>
                  <div className="w-20 h-6 bg-navy-border rounded" />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center text-muted py-14 text-sm">
              {total === 0 ? 'No leads yet — run the scraper to populate data.' : 'No leads match this filter.'}
            </div>
          ) : (
            displayed.map(lead => <LeadCard key={lead.id} lead={lead} />)
          )}

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-navy-border">
              <span className="text-muted text-xs">
                {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={offset === 0} onClick={() => load(offset - LIMIT)}
                  className="text-xs px-3 py-1.5 rounded border border-navy-border text-muted hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors">
                  ← Prev
                </button>
                <button disabled={offset + LIMIT >= total} onClick={() => load(offset + LIMIT)}
                  className="text-xs px-3 py-1.5 rounded border border-navy-border text-muted hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
