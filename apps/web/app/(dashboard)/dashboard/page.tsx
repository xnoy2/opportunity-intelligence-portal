'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Sparkles, Inbox, Flame, Target, Wallet, Play, Loader2, ArrowRight, SatelliteDish,
} from 'lucide-react'
import Topbar from '@/components/ui/Topbar'
import StatCard from '@/components/ui/StatCard'
import { SkeletonCard, SkeletonLeadRow } from '@/components/ui/Skeleton'
import LeadRow from '@/components/leads/LeadRow'
import { getStats, getLeads, triggerScrape } from '@/lib/api'
import { fmtPipeline, fmtLastScan } from '@/lib/format'
import type { StatsResponse, Lead, LeadCategory } from '@/types'

const TABS: { key: LeadCategory; label: string }[] = [
  { key: 'all',        label: 'All' },
  { key: 'approved',   label: 'Approved' },
  { key: 'high_value', label: 'High Value' },
  { key: 'tourism',    label: 'Tourism' },
  { key: 'commercial', label: 'Commercial' },
]

export default function DashboardPage() {
  const [stats, setStats]       = useState<StatsResponse | null>(null)
  const [leads, setLeads]       = useState<Lead[]>([])
  const [loading, setLoading]   = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [tab, setTab]           = useState<LeadCategory>('all')

  const loadLeads = useCallback(async (category: LeadCategory) => {
    setLeadsLoading(true)
    try {
      const filters = category === 'all' ? {} : { category }
      const res = await getLeads({ limit: 20, ...filters })
      setLeads(res.leads)
    } finally {
      setLeadsLoading(false)
    }
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
      await triggerScrape('ni')
      const s = await getStats()
      setStats(s)
    } catch (e) { console.error(e) }
    finally { setScanning(false) }
  }

  const tabCount: Partial<Record<LeadCategory, number>> = {
    approved: stats?.approved,
    high_value: stats?.highValue,
    tourism: stats?.tourism,
  }

  return (
    <div>
      <Topbar title="Lead Alert Dashboard" subtitle="Live planning intelligence across NI" />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <SatelliteDish className="h-4 w-4" />
            Last scan:{' '}
            <span className="font-medium text-foreground">{fmtLastScan(stats?.lastScrape ?? null)}</span>
          </p>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {scanning ? 'Scanning…' : 'Run scan now'}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          ) : stats ? (
            <>
              <StatCard label="New Today"     value={stats.newToday}                  icon={Sparkles} tone="primary" />
              <StatCard label="Unactioned"    value={stats.unactioned}                icon={Inbox}    tone="warning" />
              <StatCard label="High Priority" value={stats.highValue}                 icon={Flame}    tone="primary" />
              <StatCard label="Total Leads"   value={stats.activePipeline}            icon={Target}   tone="info" />
              <StatCard label="Est. Pipeline" value={fmtPipeline(stats.pipelineValue)} icon={Wallet}  tone="success" />
            </>
          ) : null}
        </div>

        {/* Leads list */}
        <div className="card overflow-hidden">
          {/* Tabs */}
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
                {tabCount[t.key] !== undefined && (
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${
                    tab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {tabCount[t.key]}
                  </span>
                )}
              </button>
            ))}

            <Link
              href="/leads"
              className="ml-auto inline-flex items-center gap-1 whitespace-nowrap pb-2.5 pr-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {leadsLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonLeadRow key={i} />)
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Target className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No leads yet — run a scan to populate data.</p>
              </div>
            ) : (
              leads.map(lead => <LeadRow key={lead.id} lead={lead} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
