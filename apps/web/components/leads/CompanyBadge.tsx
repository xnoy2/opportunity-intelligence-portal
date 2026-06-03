'use client'

import type { Company } from '@/types'

// MD3 tonal chips
const styles: Record<string, string> = {
  BGR:      'bg-info/15 text-info',
  BWDS:     'bg-violet/15 text-violet',
  BCF:      'bg-success/15 text-success',
  MULTIPLE: 'bg-primary-container text-primary-on-container',
}

interface Props { company: Company | null }

export default function CompanyBadge({ company }: Props) {
  if (!company) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${styles[company] ?? 'bg-muted text-muted-foreground'}`}>
      {company}
    </span>
  )
}
