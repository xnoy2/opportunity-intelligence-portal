'use client'

import type { Company } from '@/types'

const styles: Record<string, string> = {
  BGR:      'bg-accent/15 text-accent border-accent/30',
  BWDS:     'bg-purple-400/15 text-purple-400 border-purple-400/30',
  BCF:      'bg-success/15 text-success border-success/30',
  MULTIPLE: 'bg-gold/15 text-gold border-gold/30',
}

interface Props { company: Company | null }

export default function CompanyBadge({ company }: Props) {
  if (!company) return <span className="text-muted text-xs">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[company] ?? 'bg-white/5 text-muted border-white/10'}`}>
      {company}
    </span>
  )
}
