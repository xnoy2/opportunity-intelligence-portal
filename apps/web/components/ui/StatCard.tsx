'use client'

import type { LucideIcon } from 'lucide-react'

type Tone = 'primary' | 'warning' | 'success' | 'info' | 'neutral'

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  primary: { icon: 'bg-primary/12 text-primary', value: 'text-foreground' },
  warning: { icon: 'bg-warning/12 text-warning', value: 'text-foreground' },
  success: { icon: 'bg-success/12 text-success', value: 'text-success' },
  info:    { icon: 'bg-info/12 text-info',       value: 'text-foreground' },
  neutral: { icon: 'bg-muted text-muted-foreground', value: 'text-foreground' },
}

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: Tone
}

export default function StatCard({ label, value, icon: Icon, tone = 'neutral' }: Props) {
  const s = toneStyles[tone]
  return (
    <div className="card p-4 transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold tabular-nums ${s.value}`}>{value}</p>
    </div>
  )
}
