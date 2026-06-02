'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/ui/Topbar'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import { getLeads, updateLeadStatus } from '@/lib/api'
import type { Lead, LeadStatus } from '@/types'

const STAGES: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'NEW',         label: 'New Lead',    color: 'border-accent/40'   },
  { key: 'REVIEWED',    label: 'Reviewed',    color: 'border-white/20'    },
  { key: 'CONTACTED',   label: 'Contacted',   color: 'border-warning/40'  },
  { key: 'QUOTE_SENT',  label: 'Quote Sent',  color: 'border-gold/40'     },
  { key: 'FOLLOW_UP',   label: 'Follow Up',   color: 'border-orange-400/40'},
  { key: 'NEGOTIATION', label: 'Negotiation', color: 'border-purple-400/40'},
  { key: 'WON',         label: 'Won',         color: 'border-success/40'  },
  { key: 'LOST',        label: 'Lost',        color: 'border-danger/40'   },
]

function fmt(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, status: LeadStatus) => void }) {
  const nextStages = STAGES.filter(s => s.key !== lead.status && s.key !== 'LOST')

  return (
    <div className="bg-navy border border-navy-border rounded-lg p-3 space-y-2 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="text-accent hover:text-white text-xs font-mono transition-colors truncate flex-1">
          {lead.planningRef}
        </Link>
        <ScoreBadge score={lead.leadScore} />
      </div>
      {lead.projectType && (
        <p className="text-white/80 text-xs truncate">{lead.projectType}</p>
      )}
      {lead.location && (
        <p className="text-muted text-xs truncate">{lead.location}</p>
      )}
      <div className="flex items-center justify-between">
        <CompanyBadge company={lead.assignedCompany} />
        {lead.estimatedValue && (
          <span className="text-gold text-xs font-medium">{fmt(lead.estimatedValue)}</span>
        )}
      </div>
      {/* Quick move buttons */}
      <div className="flex gap-1 pt-1">
        {nextStages.slice(0, 2).map(s => (
          <button
            key={s.key}
            onClick={() => onMove(lead.id, s.key)}
            className="text-[10px] px-2 py-0.5 rounded border border-navy-border text-muted hover:text-white hover:border-white/30 transition-colors"
          >
            → {s.label}
          </button>
        ))}
        {lead.status !== 'LOST' && (
          <button
            onClick={() => onMove(lead.id, 'LOST')}
            className="text-[10px] px-2 py-0.5 rounded border border-danger/20 text-danger/60 hover:text-danger hover:border-danger/50 transition-colors ml-auto"
          >
            Lost
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
      <Topbar title="Pipeline" />

      <div className="p-6">
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STAGES.map(s => (
              <div key={s.key} className="flex-shrink-0 w-56 bg-navy-card border border-navy-border rounded-lg p-3 space-y-2">
                <div className="h-4 bg-navy-border rounded animate-pulse" />
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-24 bg-navy-border rounded animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
            {STAGES.map(stage => {
              const cards = byStage(stage.key)
              const val = stageValue(stage.key)
              return (
                <div key={stage.key} className={`flex-shrink-0 w-60 bg-navy-card border-t-2 ${stage.color} border-x border-b border-navy-border rounded-lg flex flex-col`}>
                  {/* Column header */}
                  <div className="px-3 py-3 border-b border-navy-border">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs font-semibold">{stage.label}</span>
                      <span className="text-muted text-xs bg-navy rounded-full px-2 py-0.5">{cards.length}</span>
                    </div>
                    {val > 0 && (
                      <p className="text-gold text-xs mt-1">{fmt(val)}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {cards.length === 0 ? (
                      <p className="text-muted text-xs text-center py-6">Empty</p>
                    ) : (
                      cards.map(lead => (
                        <LeadCard key={lead.id} lead={lead} onMove={handleMove} />
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
