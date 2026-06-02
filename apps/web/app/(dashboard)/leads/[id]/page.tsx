'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/ui/Topbar'
import Skeleton from '@/components/ui/Skeleton'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import StatusBadge from '@/components/leads/StatusBadge'
import { getLead, updateLeadStatus, addNote } from '@/lib/api'
import { getStoredUser } from '@/lib/auth'
import type { Lead, LeadStatus } from '@/types'

const STATUSES: LeadStatus[] = ['NEW','REVIEWED','CONTACTED','QUOTE_SENT','FOLLOW_UP','NEGOTIATION','WON','LOST']

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
      <div className="text-white text-sm">{value ?? <span className="text-muted">—</span>}</div>
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const user = getStoredUser()

  useEffect(() => {
    getLead(id)
      .then(setLead)
      .catch(() => router.replace('/leads'))
      .finally(() => setLoading(false))
  }, [id, router])

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return
    setUpdatingStatus(true)
    try {
      const updated = await updateLeadStatus(lead.id, status)
      setLead(prev => prev ? { ...prev, status: updated.status } : prev)
    } catch (e) { console.error(e) }
    finally { setUpdatingStatus(false) }
  }

  async function handleNoteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lead || !note.trim()) return
    setSavingNote(true)
    try {
      const created = await addNote(lead.id, note.trim())
      setLead(prev => prev ? { ...prev, notes: [created, ...(prev.notes ?? [])] } : prev)
      setNote('')
    } catch (e) { console.error(e) }
    finally { setSavingNote(false) }
  }

  function fmt(n: number) {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
    return `£${n}`
  }

  return (
    <div>
      <Topbar title="Lead Detail" />

      <div className="p-6 max-w-5xl">
        {/* Back */}
        <Link href="/leads" className="text-muted text-sm hover:text-white transition-colors mb-4 inline-flex items-center gap-1">
          ← Back to Leads
        </Link>

        {loading ? (
          <div className="space-y-4 mt-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : lead ? (
          <div className="mt-4 space-y-5">
            {/* Header */}
            <div className="bg-navy-card border border-navy-border rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={lead.leadScore} />
                  <div>
                    <h2 className="text-white font-bold text-lg font-mono">{lead.planningRef}</h2>
                    <p className="text-muted text-sm mt-0.5">{lead.location ?? 'Location unknown'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CompanyBadge company={lead.assignedCompany} />
                  <StatusBadge status={lead.status} />
                  {lead.sourceUrl && (
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs border border-navy-border text-muted hover:text-white hover:border-white/30 rounded px-3 py-1.5 transition-colors"
                    >
                      View on portal ↗
                    </a>
                  )}
                </div>
              </div>

              {/* Estimated value */}
              {lead.estimatedValue && (
                <div className="mt-4 inline-flex items-center gap-2 bg-gold/10 border border-gold/20 rounded-lg px-4 py-2">
                  <span className="text-muted text-xs">Estimated value</span>
                  <span className="text-gold font-bold">{fmt(lead.estimatedValue)}</span>
                </div>
              )}
            </div>

            {/* AI Summary + Suggested Action */}
            {(lead.aiSummary || lead.suggestedAction) && (
              <div className="bg-navy-card border border-navy-border rounded-lg p-5 space-y-4">
                <h3 className="text-white font-semibold text-sm">AI Analysis</h3>
                {lead.aiSummary && (
                  <div>
                    <p className="text-muted text-xs uppercase tracking-wider mb-1">Summary</p>
                    <p className="text-white/90 text-sm leading-relaxed">{lead.aiSummary}</p>
                  </div>
                )}
                {lead.suggestedAction && (
                  <div>
                    <p className="text-muted text-xs uppercase tracking-wider mb-1">Suggested Action</p>
                    <p className="text-white/90 text-sm leading-relaxed">{lead.suggestedAction}</p>
                  </div>
                )}
              </div>
            )}

            {/* Details grid */}
            <div className="bg-navy-card border border-navy-border rounded-lg p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Application Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                <Field label="Project Type" value={lead.projectType} />
                <Field label="Applicant" value={lead.applicantName} />
                <Field label="Postcode" value={lead.postcode} />
                <Field label="Date Submitted" value={lead.dateSubmitted ? new Date(lead.dateSubmitted).toLocaleDateString('en-GB') : null} />
                <Field label="Date Approved" value={lead.dateApproved ? new Date(lead.dateApproved).toLocaleDateString('en-GB') : null} />
                <Field label="Source Region" value={lead.sourceRegion} />
              </div>
              {lead.description && (
                <div className="mt-5">
                  <p className="text-muted text-xs uppercase tracking-wider mb-2">Description</p>
                  <p className="text-white/80 text-sm leading-relaxed bg-navy rounded-lg p-4 border border-navy-border">
                    {lead.description}
                  </p>
                </div>
              )}
            </div>

            {/* Pipeline actions */}
            <div className="bg-navy-card border border-navy-border rounded-lg p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Update Pipeline Stage</h3>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    disabled={updatingStatus || lead.status === s}
                    onClick={() => handleStatusChange(s)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed ${
                      lead.status === s
                        ? 'bg-gold/15 border-gold/40 text-gold'
                        : 'border-navy-border text-muted hover:text-white hover:border-white/30 disabled:opacity-40'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-navy-card border border-navy-border rounded-lg p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Notes</h3>

              <form onSubmit={handleNoteSubmit} className="space-y-3 mb-5">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note…"
                  rows={3}
                  className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2.5 text-white text-sm placeholder-muted focus:outline-none focus:border-gold/50 resize-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={savingNote || !note.trim()}
                  className="bg-gold hover:bg-gold-dark text-navy text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingNote ? 'Saving…' : 'Add Note'}
                </button>
              </form>

              {lead.notes && lead.notes.length > 0 ? (
                <div className="space-y-3">
                  {lead.notes.map(n => (
                    <div key={n.id} className="bg-navy rounded-lg p-4 border border-navy-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white text-xs font-medium">{n.author}</span>
                        <span className="text-muted text-xs">
                          {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-white/80 text-sm">{n.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-sm">No notes yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
