'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import { getLeads, updateLeadStatus } from '@/lib/api'
import { fmtCurrency } from '@/lib/format'
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

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, status: LeadStatus) => void }) {
  const nextStages = STAGES.filter(s => s.key !== lead.status && s.key !== 'LOST')

  return (
    <div className="group rounded-lg border border-border bg-background p-3 transition-shadow hover:shadow-soft">
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

      {/* Quick move */}
      <div className="mt-2.5 flex flex-wrap gap-1 border-t border-border pt-2.5">
        {nextStages.slice(0, 2).map(s => (
          <button
            key={s.key}
            onClick={() => onMove(lead.id, s.key)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowRight className="h-2.5 w-2.5" /> {s.label}
          </button>
        ))}
        {lead.status !== 'LOST' && (
          <button
            onClick={() => onMove(lead.id, 'LOST')}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-danger/20 px-2 py-0.5 text-[10px] font-medium text-danger/70 transition-colors hover:border-danger/50 hover:text-danger"
          >
            <X className="h-2.5 w-2.5" /> Lost
          </button>
        )}
      </div>
    </div>
  )
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

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

  const byStage = (key: LeadStatus) => leads.filter(l => l.status === key)
  const stageValue = (key: LeadStatus) =>
    leads.filter(l => l.status === key).reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

  return (
    <div>
      <Topbar title="Pipeline" subtitle="Drag leads through your sales stages" />

      <div className="p-6">
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(s => (
              <div key={s.key} className="w-64 flex-shrink-0 space-y-2 rounded-lg border border-border bg-card p-3">
                <div className="skeleton h-4 w-24" />
                {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[60vh] gap-4 overflow-x-auto pb-4">
            {STAGES.map(stage => {
              const cards = byStage(stage.key)
              const val = stageValue(stage.key)
              return (
                <div key={stage.key} className="flex w-64 flex-shrink-0 flex-col rounded-lg border border-border bg-card">
                  {/* Column header */}
                  <div className="border-b border-border px-3 py-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <span className={`h-2 w-2 rounded-full ${stage.accent}`} />
                        {stage.label}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{cards.length}</span>
                    </div>
                    {val > 0 && <p className="mt-1 pl-4 text-xs font-medium text-primary">{fmtCurrency(val)}</p>}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2 overflow-y-auto p-2">
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
