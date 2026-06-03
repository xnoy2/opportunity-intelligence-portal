'use client'

import type { LeadStatus } from '@/types'

const labels: Record<LeadStatus, string> = {
  NEW:         'New',
  REVIEWED:    'Reviewed',
  CONTACTED:   'Contacted',
  QUOTE_SENT:  'Quote Sent',
  FOLLOW_UP:   'Follow Up',
  NEGOTIATION: 'Negotiation',
  WON:         'Won',
  LOST:        'Lost',
}

const styles: Record<LeadStatus, string> = {
  NEW:         'bg-info/12 text-info ring-info/25',
  REVIEWED:    'bg-muted text-muted-foreground ring-border',
  CONTACTED:   'bg-warning/12 text-warning ring-warning/25',
  QUOTE_SENT:  'bg-primary/12 text-primary ring-primary/25',
  FOLLOW_UP:   'bg-warning/12 text-warning ring-warning/25',
  NEGOTIATION: 'bg-violet/12 text-violet ring-violet/25',
  WON:         'bg-success/12 text-success ring-success/25',
  LOST:        'bg-danger/12 text-danger ring-danger/25',
}

const dot: Record<LeadStatus, string> = {
  NEW:         'bg-info',
  REVIEWED:    'bg-muted-foreground',
  CONTACTED:   'bg-warning',
  QUOTE_SENT:  'bg-primary',
  FOLLOW_UP:   'bg-warning',
  NEGOTIATION: 'bg-violet',
  WON:         'bg-success',
  LOST:        'bg-danger',
}

interface Props { status: LeadStatus }

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {labels[status]}
    </span>
  )
}
