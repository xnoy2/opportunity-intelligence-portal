'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Sparkles, Lightbulb, MessageSquarePlus, Banknote } from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import Button from '@/components/ui/Button'
import Skeleton from '@/components/ui/Skeleton'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import StatusBadge from '@/components/leads/StatusBadge'
import { getLead, updateLeadStatus, addNote } from '@/lib/api'
import { fmtCurrency } from '@/lib/format'
import type { Lead, LeadStatus } from '@/types'

const STATUSES: LeadStatus[] = ['NEW','REVIEWED','CONTACTED','QUOTE_SENT','FOLLOW_UP','NEGOTIATION','WON','LOST']

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</div>
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

  return (
    <div>
      <Topbar title="Lead Detail" />

      <div className="mx-auto max-w-5xl p-6">
        <Link
          href="/leads"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Leads
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : lead ? (
          <div className="animate-fade-in space-y-5">
            {/* Header */}
            <div className="md-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ScoreBadge score={lead.leadScore} size="lg" />
                  <div>
                    <h2 className="font-mono text-xl font-medium text-foreground">{lead.planningRef}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{lead.location ?? 'Location unknown'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <CompanyBadge company={lead.assignedCompany} />
                  <StatusBadge status={lead.status} />
                  {lead.sourceUrl && (
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="state-layer inline-flex h-9 items-center gap-1.5 rounded-full border border-outline px-4 text-xs font-medium text-foreground transition-colors"
                    >
                      View on portal <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {lead.estimatedValue && (
                <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary-container px-4 py-2.5 text-primary-on-container">
                  <Banknote className="h-4 w-4" />
                  <span className="text-xs opacity-80">Estimated value</span>
                  <span className="font-medium">{fmtCurrency(lead.estimatedValue)}</span>
                </div>
              )}
            </div>

            {/* AI Analysis */}
            {(lead.aiSummary || lead.suggestedAction) && (
              <div className="md-card space-y-4 p-6">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> AI Analysis
                </h3>
                {lead.aiSummary && (
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
                    <p className="text-sm leading-relaxed text-foreground/90">{lead.aiSummary}</p>
                  </div>
                )}
                {lead.suggestedAction && (
                  <div className="rounded-2xl bg-surface-container p-4">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5" /> Suggested Action
                    </p>
                    <p className="text-sm leading-relaxed text-foreground/90">{lead.suggestedAction}</p>
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            <div className="md-card p-6">
              <h3 className="mb-4 text-sm font-medium text-foreground">Application Details</h3>
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
                <Field label="Project Type" value={lead.projectType} />
                <Field label="Applicant" value={lead.applicantName} />
                <Field label="Postcode" value={lead.postcode} />
                <Field label="Date Submitted" value={lead.dateSubmitted ? new Date(lead.dateSubmitted).toLocaleDateString('en-GB') : null} />
                <Field label="Date Approved" value={lead.dateApproved ? new Date(lead.dateApproved).toLocaleDateString('en-GB') : null} />
                <Field label="Source Region" value={lead.sourceRegion} />
              </div>
              {lead.description && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                  <p className="rounded-2xl bg-surface-container p-4 text-sm leading-relaxed text-foreground/80">
                    {lead.description}
                  </p>
                </div>
              )}
            </div>

            {/* Pipeline actions — MD3 filter chips */}
            <div className="md-card p-6">
              <h3 className="mb-4 text-sm font-medium text-foreground">Update Pipeline Stage</h3>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    disabled={updatingStatus || lead.status === s}
                    onClick={() => handleStatusChange(s)}
                    className={`state-layer h-8 rounded-lg px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                      lead.status === s
                        ? 'bg-primary-container text-primary-on-container'
                        : 'border border-outline text-muted-foreground hover:text-foreground disabled:opacity-40'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="md-card p-6">
              <h3 className="mb-4 text-sm font-medium text-foreground">Notes</h3>

              <form onSubmit={handleNoteSubmit} className="mb-5 space-y-3">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a note…"
                  rows={3}
                  className="focus-ring w-full resize-none rounded-2xl border border-input bg-surface-container px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-ring"
                />
                <Button type="submit" icon={MessageSquarePlus} loading={savingNote} disabled={!note.trim()}>
                  {savingNote ? 'Saving…' : 'Add Note'}
                </Button>
              </form>

              {lead.notes && lead.notes.length > 0 ? (
                <div className="space-y-3">
                  {lead.notes.map(n => (
                    <div key={n.id} className="flex gap-3 rounded-2xl bg-surface-container p-4">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-[11px] font-medium text-primary-on-container">
                        {n.author.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium text-foreground">{n.author}</span>
                          <span className="flex-shrink-0 text-xs text-muted-foreground">
                            {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80">{n.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
