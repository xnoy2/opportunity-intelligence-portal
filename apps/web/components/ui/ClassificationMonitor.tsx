'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, Loader2, StopCircle, Play, AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react'
import {
  getClassifyStatus, stopClassify, resumeClassify,
  getFailedClassifications, retryFailedClassifications,
  type ClassifyStatus, type FailedClassification,
} from '@/lib/api'

interface Props {
  refreshKey?: number
  onRunComplete?: () => void
}

export default function ClassificationMonitor({ refreshKey = 0, onRunComplete }: Props) {
  const [status, setStatus] = useState<ClassifyStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [showFailed, setShowFailed] = useState(false)
  const [failed, setFailed] = useState<FailedClassification[]>([])
  const [loadingFailed, setLoadingFailed] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const batchTotal = useRef(0)
  const wasRunning = useRef(false)

  const poll = useCallback(async () => {
    try {
      const s = await getClassifyStatus()
      const remaining = s.active + s.waiting
      if (remaining > batchTotal.current) batchTotal.current = remaining
      if (remaining === 0) {
        if (wasRunning.current) onRunComplete?.()
        batchTotal.current = 0
        wasRunning.current = false
      } else {
        wasRunning.current = true
      }
      setStatus(s)
    } catch {
      /* ignore transient poll errors */
    }
  }, [onRunComplete])

  useEffect(() => {
    poll()
    const id = setInterval(poll, 1500)
    return () => clearInterval(id)
  }, [poll, refreshKey])

  const loadFailed = useCallback(async () => {
    setLoadingFailed(true)
    try { setFailed(await getFailedClassifications()) }
    catch { /* ignore */ }
    finally { setLoadingFailed(false) }
  }, [])

  async function toggleFailed() {
    const next = !showFailed
    setShowFailed(next)
    if (next) await loadFailed()
  }

  async function handleRetry() {
    setRetrying(true)
    try {
      await retryFailedClassifications()
      await poll()
      await loadFailed()
    } finally { setRetrying(false) }
  }

  if (!status) return null

  const remaining = status.active + status.waiting
  const running = remaining > 0 && !status.paused
  const processed = Math.max(0, batchTotal.current - remaining)
  const pct = batchTotal.current > 0 ? Math.round((processed / batchTotal.current) * 100) : 0

  async function handleStop() {
    setBusy(true)
    try { await stopClassify(); await poll() } finally { setBusy(false) }
  }
  async function handleResume() {
    setBusy(true)
    try { await resumeClassify(); await poll() } finally { setBusy(false) }
  }

  const state = status.paused ? 'stopped' : running ? 'running' : 'idle'
  const statePill = {
    running: { label: 'Classifying', cls: 'bg-info/15 text-info' },
    stopped: { label: 'Stopped',     cls: 'bg-danger/15 text-danger' },
    idle:    { label: 'Idle',        cls: 'bg-muted text-muted-foreground' },
  }[state]

  return (
    <div className="md-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-primary-on-container">
            {running ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Brain className="h-[18px] w-[18px]" />}
          </span>
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              AI Classification
              <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${statePill.cls}`}>{statePill.label}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {status.unclassified.toLocaleString('en-GB')} lead{status.unclassified !== 1 ? 's' : ''} not yet classified
            </p>
          </div>
        </div>

        {running ? (
          <button
            onClick={handleStop}
            disabled={busy}
            className="state-layer inline-flex h-9 items-center gap-1.5 rounded-full bg-danger px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />} Stop
          </button>
        ) : status.paused ? (
          <button
            onClick={handleResume}
            disabled={busy}
            className="state-layer inline-flex h-9 items-center gap-1.5 rounded-full border border-outline px-4 text-sm font-medium text-foreground transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Resume
          </button>
        ) : null}
      </div>

      {/* Live counts */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Classifying now" value={status.active} tone="text-info" />
        <Stat label="Queued (left)"   value={status.waiting} tone="text-foreground" />
        <button
          type="button"
          onClick={status.failed > 0 ? toggleFailed : undefined}
          className={`rounded-xl bg-surface-container px-3 py-2.5 text-left transition-colors ${status.failed > 0 ? 'state-layer hover:bg-accent' : 'cursor-default'}`}
        >
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Failed
            {status.failed > 0 && <ChevronDown className={`h-3 w-3 transition-transform ${showFailed ? 'rotate-180' : ''}`} />}
          </p>
          <p className={`mt-0.5 flex items-center gap-1 text-xl font-medium tabular-nums ${status.failed > 0 ? 'text-danger' : 'text-muted-foreground'}`}>
            {status.failed > 0 && <AlertTriangle className="h-4 w-4" />}
            {status.failed.toLocaleString('en-GB')}
          </p>
        </button>
      </div>

      {/* Progress bar for the current run */}
      {batchTotal.current > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{processed.toLocaleString('en-GB')} of {batchTotal.current.toLocaleString('en-GB')} done</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Failed list */}
      {showFailed && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface-container px-3 py-2">
            <p className="text-xs font-medium text-foreground">Failed classifications</p>
            <button
              onClick={handleRetry}
              disabled={retrying || status.failed === 0}
              className="state-layer inline-flex h-7 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors disabled:opacity-50"
            >
              {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry all
            </button>
          </div>
          <div className="max-h-64 divide-y divide-border overflow-y-auto">
            {loadingFailed ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Loading…</p>
            ) : failed.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No failed jobs.</p>
            ) : (
              failed.map(f => (
                <div key={f.jobId} className="px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-foreground">{f.planningRef ?? f.leadId ?? f.jobId}</span>
                    {f.sourceRegion && <span className="text-[10px] text-muted-foreground">{f.sourceRegion}</span>}
                  </div>
                  {f.location && <p className="truncate text-[11px] text-muted-foreground">{f.location}</p>}
                  <p className="mt-0.5 text-[11px] text-danger">{f.reason}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl bg-surface-container px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-xl font-medium tabular-nums ${tone}`}>{value.toLocaleString('en-GB')}</p>
    </div>
  )
}
