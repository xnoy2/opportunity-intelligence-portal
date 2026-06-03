'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Topbar from '@/components/ui/Topbar'
import { SkeletonCard } from '@/components/ui/Skeleton'
import CompanyBadge from '@/components/leads/CompanyBadge'
import { getStats, getLeads, triggerScrape } from '@/lib/api'
import type { StatsResponse, Lead, LeadCategory } from '@/types'

const TABS: { key: LeadCategory; label: string; icon: string }[] = [
  { key: 'all',        label: 'All Leads',   icon: '◎' },
  { key: 'approved',   label: 'Approved',    icon: '✓' },
  { key: 'high_value', label: 'High Value',  icon: '◈' },
  { key: 'tourism',    label: 'Tourism',     icon: '✈' },
  { key: 'commercial', label: 'Commercial',  icon: '◆' },
]

function fmtValue(n: number) {
  const lo = Math.round(n * 0.75 / 1000) * 1000
  const hi = Math.round(n * 1.4 / 1000) * 1000
  const f = (v: number) => v >= 1000 ? `£${v / 1000}k` : `£${v}`
  return `${f(lo)}–${f(hi)}`
}

function fmtPipeline(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${Math.round(n / 1000)}k+`
  return `£${n}`
}

function fmtLastScan(iso: string | null) {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function CategoryBadge({ projectType, dateApproved, score }: { projectType: string | null; dateApproved: string | null; score: number }) {
  if (dateApproved) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-success/40 bg-success/10 text-success font-medium">
      ✓ Approved
    </span>
  )
  if (score >= 85) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-warning/40 bg-warning/10 text-warning font-medium">
      ◈ High Value Pending
    </span>
  )
  const pt = (projectType ?? '').toLowerCase()
  if (pt.includes('tourism') || pt.includes('holiday') || pt.includes('glamping') || pt.includes('pod')) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent font-medium">
      ✈ Tourism
    </span>
  )
  if (pt.includes('commercial') || pt.includes('office') || pt.includes('retail')) return (
    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-purple-400/40 bg-purple-400/10 text-purple-400 font-medium">
      ◆ Commercial
    </span>
  )
  return null
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="flex items-center gap-4 px-5 py-4 border-b border-navy-border hover:bg-navy-hover transition-colors cursor-pointer">
        {/* Score */}
        <div className="flex-shrink-0 w-12 text-center">
          <span className={`text-2xl font-bold ${lead.leadScore >= 85 ? 'text-gold' : lead.leadScore >= 70 ? 'text-warning' : 'text-muted'}`}>
            {lead.leadScore}
          </span>
          <p className="text-muted text-[9px] uppercase tracking-wider">SCORE</p>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <CategoryBadge projectType={lead.projectType} dateApproved={lead.dateApproved} score={lead.leadScore} />
          </div>
          <p className="text-white text-sm font-medium truncate">{lead.location ?? lead.planningRef}</p>
          <p className="text-muted text-xs mt-0.5">
            {lead.planningRef} · {lead.sourceRegion ?? 'NI'}
            {lead.assignedCompany && <> · <CompanyBadge company={lead.assignedCompany} /></>}
          </p>
        </div>

        {/* Value + arrow */}
        <div className="flex-shrink-0 text-right">
          {lead.estimatedValue ? (
            <p className="text-gold text-sm font-semibold">{fmtValue(lead.estimatedValue)}</p>
          ) : (
            <p className="text-muted text-xs">—</p>
          )}
          <span className="text-muted text-xs mt-1 block">▾</span>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const [stats, setStats]       = useState<StatsResponse | null>(null)
  const [leads, setLeads]       = useState<Lead[]>([])
  const [loading, setLoading]   = useState(true)
  const [scanning, setScanning] = useState(false)
  const [tab, setTab]           = useState<LeadCategory>('all')

  const loadLeads = useCallback(async (category: LeadCategory) => {
    const filters = category === 'all' ? {} : { category }
    const res = await getLeads({ limit: 20, ...filters })
    setLeads(res.leads)
  }, [])

  useEffect(() => {
    Promise.all([getStats(), getLeads({ limit: 20 })])
      .then(([s, l]) => { setStats(s); setLeads(l.leads) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading) loadLeads(tab).catch(console.error)
  }, [tab, loading, loadLeads])

  async function handleScan() {
    setScanning(true)
    try {
      // Trigger all active sources in parallel
      await Promise.all([
        triggerScrape('ni'),
        triggerScrape('roi'),
        triggerScrape('pleanala'),
      ])
      const s = await getStats()
      setStats(s)
    } catch (e) { console.error(e) }
    finally { setScanning(false) }
  }

  return (
    <div>
      <Topbar title="Lead Alert Dashboard" />

      <div className="p-6 space-y-5">
        {/* Header row: last scan + RUN SCAN NOW */}
        <div className="flex items-center justify-between">
          <p className="text-muted text-sm">
            Last scan: <span className="text-white">{fmtLastScan(stats?.lastScrape ?? null)}</span>
          </p>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{scanning ? '◌' : '▶'}</span>
            {scanning ? 'SCANNING…' : 'RUN SCAN NOW'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : stats ? (
            <>
              <div className="bg-navy-card border border-navy-border rounded-lg p-5">
                <p className="text-muted text-xs uppercase tracking-wider">New Today</p>
                <p className="text-gold text-3xl font-bold mt-2">{stats.newToday}</p>
              </div>
              <div className="bg-navy-card border border-navy-border rounded-lg p-5">
                <p className="text-muted text-xs uppercase tracking-wider">Unactioned</p>
                <p className="text-warning text-3xl font-bold mt-2">{stats.unactioned}</p>
              </div>
              <div className="bg-navy-card border border-navy-border rounded-lg p-5">
                <p className="text-muted text-xs uppercase tracking-wider">High Priority</p>
                <p className="text-gold text-3xl font-bold mt-2">{stats.highValue}</p>
              </div>
              <div className="bg-navy-card border border-navy-border rounded-lg p-5">
                <p className="text-muted text-xs uppercase tracking-wider">Total Leads</p>
                <p className="text-white text-3xl font-bold mt-2">{stats.activePipeline}</p>
              </div>
              <div className="bg-navy-card border border-navy-border rounded-lg p-5">
                <p className="text-muted text-xs uppercase tracking-wider">Est. Pipeline</p>
                <p className="text-success text-3xl font-bold mt-2">{fmtPipeline(stats.pipelineValue)}</p>
              </div>
            </>
          ) : null}
        </div>

        {/* Leads card list with tabs */}
        <div className="bg-navy-card border border-navy-border rounded-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-5 pt-4 border-b border-navy-border overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  tab === t.key
                    ? 'border-gold text-gold'
                    : 'border-transparent text-muted hover:text-white'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
                {t.key === 'approved' && stats && (
                  <span className="ml-1 text-xs bg-success/20 text-success rounded-full px-1.5">{stats.approved}</span>
                )}
                {t.key === 'high_value' && stats && (
                  <span className="ml-1 text-xs bg-gold/20 text-gold rounded-full px-1.5">{stats.highValue}</span>
                )}
                {t.key === 'tourism' && stats && (
                  <span className="ml-1 text-xs bg-accent/20 text-accent rounded-full px-1.5">{stats.tourism}</span>
                )}
              </button>
            ))}

            <Link href="/leads" className="ml-auto text-muted text-xs hover:text-white transition-colors pb-2.5 whitespace-nowrap">
              View all →
            </Link>
          </div>

          {/* Lead cards */}
          <div>
            {leads.length === 0 && !loading ? (
              <div className="text-center text-muted py-14 text-sm">
                No leads yet — run the scraper to populate data.
              </div>
            ) : (
              leads.map(lead => <LeadCard key={lead.id} lead={lead} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
