'use client'

import type { Company } from '@/types'

const styles: Record<string, string> = {
  BGR:      'bg-info/12 text-info ring-info/25',
  BWDS:     'bg-violet/12 text-violet ring-violet/25',
  BCF:      'bg-success/12 text-success ring-success/25',
  MULTIPLE: 'bg-primary/12 text-primary ring-primary/25',
}

interface Props { company: Company | null }

export default function CompanyBadge({ company }: Props) {
  if (!company) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ${styles[company] ?? 'bg-muted text-muted-foreground ring-border'}`}>
      {company}
    </span>
  )
}
