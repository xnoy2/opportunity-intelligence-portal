'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Target } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import { SkeletonLeadRow } from '@/components/ui/Skeleton'
import LeadRow from '@/components/leads/LeadRow'
import ScoreFilter from '@/components/ui/ScoreFilter'
import { getLeads } from '@/lib/api'
import type { Lead, LeadCategory } from '@/types'

const TABS: { key: LeadCategory; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'approved',   label: 'Approved' },
  { key: 'high_value', label: 'High Value' },
  { key: 'tourism',    label: 'Tourism' },
  { key: 'commercial', label: 'Commercial' },
]

const ACTIONED = new Set(['CONTACTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'WON', 'LOST'])

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
      <Topbar title="Leads" subtitle="Browse and filter scored opportunities" />

      <div className="mx-auto max-w-7xl space-y-4 p-6">
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`state-layer h-8 rounded-lg px-4 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-primary-container text-primary-on-container'
                  : 'border border-outline text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-3">
          <ScoreFilter value={minScore} onChange={setMinScore} />
          <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
            <span className="text-xs text-muted-foreground">Show actioned</span>
            <button
              type="button"
              role="switch"
              aria-checked={showActioned}
              onClick={() => setShowActioned(v => !v)}
              className={`focus-ring relative h-6 w-11 rounded-full border-2 transition-colors ${
                showActioned ? 'border-primary bg-primary' : 'border-outline bg-muted'
              }`}
            >
              <span className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all ${
                showActioned ? 'left-[22px] h-4 w-4 bg-primary-foreground' : 'left-1 h-3 w-3 bg-outline'
              }`} />
            </button>
          </label>
          </div>
        </div>

        <div className="md-card overflow-hidden">
          {/* Count line */}
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {displayed.length} lead{displayed.length !== 1 ? 's' : ''}
              {!showActioned && <span> · unactioned only</span>}
              {showActioned && actioned > 0 && <span> · {actioned} actioned</span>}
            </p>
          </div>

          {/* Rows */}
          <div>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonLeadRow key={i} />)
            ) : displayed.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Target className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {total === 0 ? 'No leads yet — run a scan to populate data.' : 'No leads match this filter.'}
                </p>
              </div>
            ) : (
              displayed.map(lead => <LeadRow key={lead.id} lead={lead} showPending />)
            )}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => load(offset - LIMIT)}
                  className="state-layer inline-flex h-9 items-center gap-1 rounded-full border border-outline px-4 text-xs font-medium text-foreground transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => load(offset + LIMIT)}
                  className="state-layer inline-flex h-9 items-center gap-1 rounded-full border border-outline px-4 text-xs font-medium text-foreground transition-colors disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
