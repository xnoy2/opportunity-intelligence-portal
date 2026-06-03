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
  NEW:         'bg-info/15 text-info',
  REVIEWED:    'bg-muted text-muted-foreground',
  CONTACTED:   'bg-warning/15 text-warning',
  QUOTE_SENT:  'bg-primary-container text-primary-on-container',
  FOLLOW_UP:   'bg-warning/15 text-warning',
  NEGOTIATION: 'bg-violet/15 text-violet',
  WON:         'bg-success/15 text-success',
  LOST:        'bg-danger/15 text-danger',
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
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {labels[status]}
    </span>
  )
}
