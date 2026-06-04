'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Brain, Loader2, StopCircle, Play, AlertTriangle } from 'lucide-react'
import { getClassifyStatus, stopClassify, resumeClassify, type ClassifyStatus } from '@/lib/api'

interface Props {
  /** Bump this number to force an immediate refresh (e.g. right after queueing). */
  refreshKey?: number
  /** Called once when an active run finishes (remaining → 0). */
  onRunComplete?: () => void
}

export default function ClassificationMonitor({ refreshKey = 0, onRunComplete }: Props) {
  const [status, setStatus] = useState<ClassifyStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const batchTotal = useRef(0)
  const wasRunning = useRef(false)

  const poll = useCallback(async () => {
    try {
      const s = await getClassifyStatus()
      const remaining = s.active + s.waiting

      // Track the high-water mark of the current run for the progress bar.
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
        <Stat label="Failed"          value={status.failed} tone={status.failed > 0 ? 'text-danger' : 'text-muted-foreground'} icon={status.failed > 0} />
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
    </div>
  )
}

function Stat({ label, value, tone, icon }: { label: string; value: number; tone: string; icon?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-container px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 flex items-center gap-1 text-xl font-medium tabular-nums ${tone}`}>
        {icon && <AlertTriangle className="h-4 w-4" />}
        {value.toLocaleString('en-GB')}
      </p>
    </div>
  )
}
