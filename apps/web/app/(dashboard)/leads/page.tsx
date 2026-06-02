'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Topbar from '@/components/ui/Topbar'
import { SkeletonRow } from '@/components/ui/Skeleton'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import StatusBadge from '@/components/leads/StatusBadge'
import { getLeads } from '@/lib/api'
import type { Lead, LeadStatus, Company } from '@/types'

const STATUSES: LeadStatus[] = ['NEW','REVIEWED','CONTACTED','QUOTE_SENT','FOLLOW_UP','NEGOTIATION','WON','LOST']
const COMPANIES: Company[] = ['BGR','BWDS','BCF','MULTIPLE']

function fmt(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

function relativeDate(d: string | null) {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState('')
  const [company, setCompany] = useState('')
  const [minScore, setMinScore] = useState('')
  const LIMIT = 50

  const load = useCallback(async (off = 0) => {
    setLoading(true)
    try {
      const res = await getLeads({
        limit: LIMIT,
        offset: off,
        ...(status ? { status } : {}),
        ...(company ? { company } : {}),
        ...(minScore ? { minScore: Number(minScore) } : {}),
      })
      setLeads(res.leads)
      setTotal(res.total)
      setOffset(off)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [status, company, minScore])

  useEffect(() => { load(0) }, [load])

  function FilterSelect({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder: string
  }) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-navy border border-navy-border text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-gold/50"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  return (
    <div>
      <Topbar title="Leads" />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="bg-navy-card border border-navy-border rounded-lg px-5 py-4 flex flex-wrap items-center gap-3">
          <span className="text-muted text-sm">Filter:</span>
          <FilterSelect value={status} onChange={setStatus} options={STATUSES} placeholder="All statuses" />
          <FilterSelect value={company} onChange={setCompany} options={COMPANIES} placeholder="All companies" />
          <select
            value={minScore}
            onChange={e => setMinScore(e.target.value)}
            className="bg-navy border border-navy-border text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-gold/50"
          >
            <option value="">Any score</option>
            <option value="85">Score 85+</option>
            <option value="70">Score 70+</option>
            <option value="50">Score 50+</option>
          </select>
          {(status || company || minScore) && (
            <button
              onClick={() => { setStatus(''); setCompany(''); setMinScore('') }}
              className="text-muted text-sm hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-muted text-sm">{total} leads</span>
        </div>

        {/* Table */}
        <div className="bg-navy-card border border-navy-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border">
                  {['Score','Reference','Type','Location','Company','Est. Value','Status','Submitted','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
                  : leads.map(lead => (
                    <tr key={lead.id} className="border-b border-navy-border hover:bg-navy-hover transition-colors">
                      <td className="px-4 py-3"><ScoreBadge score={lead.leadScore} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="text-accent hover:text-white transition-colors font-mono text-xs">
                          {lead.planningRef}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/80 text-xs max-w-[180px] truncate">{lead.projectType ?? '—'}</td>
                      <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{lead.location ?? '—'}</td>
                      <td className="px-4 py-3"><CompanyBadge company={lead.assignedCompany} /></td>
                      <td className="px-4 py-3 text-gold text-xs font-medium whitespace-nowrap">
                        {lead.estimatedValue ? fmt(lead.estimatedValue) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">{relativeDate(lead.dateSubmitted)}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-xs text-muted hover:text-white border border-navy-border hover:border-white/30 rounded px-2 py-1 transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {!loading && leads.length === 0 && (
              <div className="text-center text-muted py-12 text-sm">No leads match your filters.</div>
            )}
          </div>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-navy-border">
              <span className="text-muted text-xs">
                Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={offset === 0}
                  onClick={() => load(offset - LIMIT)}
                  className="text-xs px-3 py-1.5 rounded border border-navy-border text-muted hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
                >
                  ← Prev
                </button>
                <button
                  disabled={offset + LIMIT >= total}
                  onClick={() => load(offset + LIMIT)}
                  className="text-xs px-3 py-1.5 rounded border border-navy-border text-muted hover:text-white hover:border-white/30 disabled:opacity-30 transition-colors"
                >
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
