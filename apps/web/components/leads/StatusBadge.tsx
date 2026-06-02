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
  NEW:         'bg-accent/15 text-accent border-accent/30',
  REVIEWED:    'bg-white/10 text-white/70 border-white/15',
  CONTACTED:   'bg-warning/15 text-warning border-warning/30',
  QUOTE_SENT:  'bg-gold/15 text-gold border-gold/30',
  FOLLOW_UP:   'bg-orange-400/15 text-orange-400 border-orange-400/30',
  NEGOTIATION: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
  WON:         'bg-success/15 text-success border-success/30',
  LOST:        'bg-danger/15 text-danger border-danger/30',
}

interface Props { status: LeadStatus }

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
