'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Search } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import { getLeads, updateLeadStatus } from '@/lib/api'
import { fmtCurrency } from '@/lib/format'
import { useDragScroll } from '@/lib/useDragScroll'
import ScoreFilter, { SCORE_TIERS, type ScoreTier } from '@/components/ui/ScoreFilter'
import CompanyFilter from '@/components/ui/CompanyFilter'
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

function LeadCard({ lead, onDragStart, onDragEnd }: {
  lead: Lead
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(lead.id) }}
      onDragEnd={onDragEnd}
      className="cursor-grab rounded-2xl bg-card p-3.5 shadow-e1 transition-shadow hover:shadow-e2 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          draggable={false}
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
    </div>
  )
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [scoreTier, setScoreTier] = useState<ScoreTier>('all')
  const [company, setCompany] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<LeadStatus | null>(null)
  const { ref: boardRef, dragProps } = useDragScroll()

  useEffect(() => {
    // Order by recency (not score) and load a wider window so leads you've
    // actively worked stay on the board instead of being pushed off by
    // higher-scoring NEW leads.
    getLeads({ limit: 500, orderBy: 'recent' })
      .then(r => setLeads(r.leads))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function moveLead(id: string, status: LeadStatus) {
    const prev = leads
    // optimistic update
    setLeads(cur => cur.map(l => l.id === id ? { ...l, status } : l))
    try {
      await updateLeadStatus(id, status)
    } catch (e) {
      console.error(e)
      setLeads(prev) // revert on failure
    }
  }

  function handleDrop(stage: LeadStatus) {
    if (draggedId) {
      const lead = leads.find(l => l.id === draggedId)
      if (lead && lead.status !== stage) moveLead(draggedId, stage)
    }
    setDraggedId(null)
    setOverStage(null)
  }

  const q = query.trim().toLowerCase()
  const { min, max } = SCORE_TIERS[scoreTier]
  const visible = leads.filter(l => {
    if (company && l.assignedCompany !== company) return false
    if (l.leadScore < min || l.leadScore > max) return false
    if (q && ![l.planningRef, l.location, l.projectType, l.assignedCompany].some(v => v?.toLowerCase().includes(q))) return false
    return true
  })

  const byStage = (key: LeadStatus) => visible.filter(l => l.status === key)
  const stageValue = (key: LeadStatus) =>
    visible.filter(l => l.status === key).reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

  return (
    <div>
      <Topbar title="Pipeline" subtitle="Drag leads between stages — synced to GoHighLevel" />

      <div className="p-6">
        {/* Filters — apply across all stages */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-xs flex-1">
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

          <CompanyFilter value={company} onChange={setCompany} />
          <ScoreFilter value={scoreTier} onChange={setScoreTier} />
          <span className="ml-auto text-xs text-muted-foreground">{visible.length} shown</span>
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
              const isOver = overStage === stage.key
              return (
                <div
                  key={stage.key}
                  onDragEnter={e => { e.preventDefault(); if (draggedId) setOverStage(stage.key) }}
                  onDragOver={e => { if (draggedId) e.preventDefault() }}
                  onDrop={() => handleDrop(stage.key)}
                  className={`flex w-64 flex-shrink-0 flex-col rounded-3xl transition-colors ${
                    isOver ? 'bg-primary-container/40 ring-2 ring-primary' : 'bg-surface-container'
                  }`}
                >
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
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        {isOver ? 'Drop here' : 'Empty'}
                      </p>
                    ) : (
                      cards.map(lead => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onDragStart={setDraggedId}
                          onDragEnd={() => { setDraggedId(null); setOverStage(null) }}
                        />
                      ))
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
