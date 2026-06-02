'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/ui/Topbar'
import { SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'
import ScoreBadge from '@/components/leads/ScoreBadge'
import CompanyBadge from '@/components/leads/CompanyBadge'
import StatusBadge from '@/components/leads/StatusBadge'
import { getStats, getLeads } from '@/lib/api'
import type { StatsResponse, Lead } from '@/types'

function fmt(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

function KPICard({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-navy-card border border-navy-border rounded-lg p-5">
      <p className="text-muted text-xs font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-muted text-xs mt-1.5">{sub}</p>}
    </div>
  )
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

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getStats(), getLeads({ limit: 15 })])
      .then(([s, l]) => { setStats(s); setLeads(l.leads) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <Topbar title="Dashboard" />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : stats ? (
            <>
              <KPICard label="New Leads Today"    value={stats.newToday}      sub="last 24 hours"           accent />
              <KPICard label="High Value (85+)"   value={stats.highValue}     sub="score ≥ 85"              accent />
              <KPICard label="Approved"           value={stats.approved}      sub="last 7 days" />
              <KPICard label="Active Pipeline"    value={stats.activePipeline} sub="excl. won/lost" />
              <KPICard label="Pipeline Value"     value={fmt(stats.pipelineValue)} sub="estimated GBP"      accent />
            </>
          ) : null}
        </div>

        {/* Company row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-navy-card border border-navy-border rounded-lg px-5 py-4 flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">BGR Leads</p>
                <p className="text-white text-xl font-bold mt-0.5">{stats.byCompany?.BGR ?? 0}</p>
              </div>
            </div>
            <div className="bg-navy-card border border-navy-border rounded-lg px-5 py-4 flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">BWDS Leads</p>
                <p className="text-white text-xl font-bold mt-0.5">{stats.byCompany?.BWDS ?? 0}</p>
              </div>
            </div>
            <div className="bg-navy-card border border-navy-border rounded-lg px-5 py-4 flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Tourism Opps</p>
                <p className="text-white text-xl font-bold mt-0.5">{stats.tourism ?? 0}</p>
              </div>
            </div>
            <div className="bg-navy-card border border-navy-border rounded-lg px-5 py-4 flex items-center gap-4">
              <span className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
              <div>
                <p className="text-muted text-xs uppercase tracking-wider">Farm Diversification</p>
                <p className="text-white text-xl font-bold mt-0.5">{stats.farmDiv ?? 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Leads Table */}
        <div className="bg-navy-card border border-navy-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy-border">
            <h2 className="text-white font-semibold">Top Opportunities</h2>
            <Link href="/leads" className="text-gold text-sm hover:text-gold-light transition-colors">
              View all →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border">
                  {['Score', 'Reference', 'Type', 'Location', 'Company', 'Value', 'Status', 'Submitted'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted text-xs font-medium uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  : leads.map(lead => (
                    <tr key={lead.id} className="border-b border-navy-border hover:bg-navy-hover transition-colors">
                      <td className="px-4 py-3"><ScoreBadge score={lead.leadScore} /></td>
                      <td className="px-4 py-3">
                        <Link href={`/leads/${lead.id}`} className="text-accent hover:text-white transition-colors font-mono text-xs">
                          {lead.planningRef}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white/80 text-xs">{lead.projectType ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted text-xs">{lead.location ?? '—'}</td>
                      <td className="px-4 py-3"><CompanyBadge company={lead.assignedCompany} /></td>
                      <td className="px-4 py-3 text-gold text-xs font-medium">
                        {lead.estimatedValue ? fmt(lead.estimatedValue) : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 text-muted text-xs">{relativeDate(lead.dateSubmitted)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
            {!loading && leads.length === 0 && (
              <div className="text-center text-muted py-12 text-sm">
                No leads yet — run the scraper to populate data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
