'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X, Search } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import { getLeads, updateLeadStatus } from '@/lib/api'
import { fmtCurrency } from '@/lib/format'
import { useDragScroll } from '@/lib/useDragScroll'
import type { Lead, LeadStatus } from '@/types'

const STAGES: { key: LeadStatus; label: string; accent: string }[] = [
  { key: 'NEW',         label: 'New Lead',    accent: 'bg-info' },
  { key: 'REVIEWED',    label: 'Reviewed',    accent: 'bg-muted-foreground' },
  { key: 'CONTACTED',   label: 'Contacted',   accent: 'bg-warning' },
  { key: 'QUOTE_SENT',  label: 'Quote Sent',  accent: 'bg-primary' },
  { key: 'FOLLOW_UP',   label: 'Follow Up',   accent: 'bg-warning' },
  { key: 'NEGOTIATION', label: 'Negotiation', accent: 'bg-violet' },
  { key: 'WON',         label: 'Won',         accent: 'bg-success' },
  { key: 'LOST',        label: 'Lost',        accent: 'bg-danger' },
]

// Stages hidden from the card quick-move buttons (still available on the lead detail page)
const HIDDEN_QUICK_MOVE: LeadStatus[] = ['NEW', 'REVIEWED', 'LOST']

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, status: LeadStatus) => void }) {
  const nextStages = STAGES.filter(s => s.key !== lead.status && !HIDDEN_QUICK_MOVE.includes(s.key))

  return (
    <div className="rounded-2xl bg-card p-3.5 shadow-e1 transition-shadow hover:shadow-e2">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          className="truncate font-mono text-xs font-medium text-info transition-colors hover:underline"
        >
          {lead.planningRef}
        </Link>
        <ScoreBadge score={lead.leadScore} />
      </div>

      {lead.projectType && <p className="mt-2 truncate text-xs text-foreground/80">{lead.projectType}</p>}
      {lead.location && <p className="truncate text-xs text-muted-foreground">{lead.location}</p>}

      <div className="mt-2 flex items-center justify-between">
        <CompanyBadge company={lead.assignedCompany} />
        {lead.estimatedValue && <span className="text-xs font-medium text-primary">{fmtCurrency(lead.estimatedValue)}</span>}
      </div>

      {/* Quick move — forward progression only */}
      {nextStages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
          {nextStages.slice(0, 2).map(s => (
            <button
              key={s.key}
              onClick={() => onMove(lead.id, s.key)}
              className="state-layer inline-flex items-center gap-1 rounded-lg border border-outline px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight className="h-2.5 w-2.5" /> {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const { ref: boardRef, dragProps } = useDragScroll()

  useEffect(() => {
    getLeads({ limit: 200 })
      .then(r => setLeads(r.leads))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleMove(id: string, status: LeadStatus) {
    try {
      const updated = await updateLeadStatus(id, status)
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: updated.status } : l))
    } catch (e) { console.error(e) }
  }

  const q = query.trim().toLowerCase()
  const visible = q
    ? leads.filter(l =>
        [l.planningRef, l.location, l.projectType, l.assignedCompany]
          .some(v => v?.toLowerCase().includes(q)),
      )
    : leads

  const byStage = (key: LeadStatus) => visible.filter(l => l.status === key)
  const stageValue = (key: LeadStatus) =>
    visible.filter(l => l.status === key).reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

  return (
    <div>
      <Topbar title="Pipeline" subtitle="Move leads through your sales stages" />

      <div className="p-6">
        {/* Search across all stages */}
        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search ref, location, project or company…"
            className="focus-ring h-10 w-full rounded-full border border-input bg-surface-container pl-9 pr-9 text-sm text-foreground placeholder-muted-foreground focus:border-ring"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="state-layer absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(s => (
              <div key={s.key} className="w-64 flex-shrink-0 space-y-2 rounded-3xl bg-surface-container p-3">
                <div className="skeleton h-4 w-24" />
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
              </div>
            ))}
          </div>
        ) : (
          <div
            ref={boardRef}
            {...dragProps}
            className="flex min-h-[60vh] cursor-grab gap-4 overflow-x-auto pb-4"
          >
            {STAGES.map(stage => {
              const cards = byStage(stage.key)
              const val = stageValue(stage.key)
              return (
                <div key={stage.key} className="flex w-64 flex-shrink-0 flex-col rounded-3xl bg-surface-container">
                  {/* Column header */}
                  <div className="px-4 py-3.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span className={`h-2 w-2 rounded-full ${stage.accent}`} />
                        {stage.label}
                      </span>
                      <span className="rounded-full bg-card px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{cards.length}</span>
                    </div>
                    {val > 0 && <p className="mt-1 pl-4 text-xs font-medium text-primary">{fmtCurrency(val)}</p>}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto px-2.5 pb-2.5">
                    {cards.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">Empty</p>
                    ) : (
                      cards.map(lead => <LeadCard key={lead.id} lead={lead} onMove={handleMove} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
