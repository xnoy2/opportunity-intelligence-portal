'use client'

import type { LucideIcon } from 'lucide-react'

type Tone = 'primary' | 'warning' | 'success' | 'info' | 'neutral'

const toneStyles: Record<Tone, { icon: string; value: string }> = {
  primary: { icon: 'bg-primary-container text-primary-on-container', value: 'text-foreground' },
  warning: { icon: 'bg-warning/15 text-warning', value: 'text-foreground' },
  success: { icon: 'bg-success/15 text-success', value: 'text-success' },
  info:    { icon: 'bg-info/15 text-info',       value: 'text-foreground' },
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
    <div className="md-card p-5 transition-shadow hover:shadow-e2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${s.icon}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className={`mt-4 text-3xl font-normal tabular-nums ${s.value}`}>{value}</p>
    </div>
  )
}
