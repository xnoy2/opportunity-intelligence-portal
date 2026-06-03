'use client'

import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Target } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import { SkeletonLeadRow } from '@/components/ui/Skeleton'
import LeadRow from '@/components/leads/LeadRow'
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
  const [offset, setOffset]         = useState(0)
  const LIMIT = 50

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      const filters: Record<string, unknown> = { limit: LIMIT, offset: off }
      if (tab !== 'all') filters.category = tab
      if (!showActioned) filters.unactioned = true
      const res = await getLeads(filters)
      setLeads(res.leads)
      setTotal(res.total)
      setOffset(off)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [tab, showActioned])

  useEffect(() => { load(0) }, [load])

  const actioned = leads.filter(l => ACTIONED.has(l.status)).length
  const displayed = showActioned ? leads : leads.filter(l => !ACTIONED.has(l.status))

  return (
    <div>
      <Topbar title="Leads" subtitle="Browse and filter scored opportunities" />

      <div className="mx-auto max-w-7xl p-6">
        <div className="card overflow-hidden">
          {/* Tabs + toggle */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-3 pt-2">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}

            <label className="ml-auto flex cursor-pointer items-center gap-2 whitespace-nowrap pb-2.5 pr-2">
              <span className="text-xs text-muted-foreground">Show actioned</span>
              <button
                type="button"
                role="switch"
                aria-checked={showActioned}
                onClick={() => setShowActioned(v => !v)}
                className={`focus-ring relative h-5 w-9 rounded-full transition-colors ${showActioned ? 'bg-primary' : 'bg-input'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${showActioned ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>

          {/* Count line */}
          <div className="border-b border-border px-5 py-2.5">
            <p className="text-xs text-muted-foreground">
              {displayed.length} lead{displayed.length !== 1 ? 's' : ''}
              {!showActioned && <span> · unactioned only</span>}
              {showActioned && actioned > 0 && <span> · {actioned} actioned</span>}
            </p>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
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
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => load(offset - LIMIT)}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => load(offset + LIMIT)}
                  className="focus-ring inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
