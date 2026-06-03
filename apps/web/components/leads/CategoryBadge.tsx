'use client'

import { CheckCircle2, Gem, Plane, Building2 } from 'lucide-react'

interface Props {
  projectType: string | null
  dateApproved: string | null
  score: number
  /** Show a neutral "Pending" pill when nothing else matches */
  showPending?: boolean
}

export default function CategoryBadge({ projectType, dateApproved, score, showPending = false }: Props) {
  const base = 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1'

  if (dateApproved)
    return (
      <span className={`${base} bg-success/12 text-success ring-success/25`}>
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    )

  if (score >= 85)
    return (
      <span className={`${base} bg-warning/12 text-warning ring-warning/25`}>
        <Gem className="h-3 w-3" /> High Value
      </span>
    )

  const pt = (projectType ?? '').toLowerCase()
  if (pt.includes('tourism') || pt.includes('holiday') || pt.includes('glamping') || pt.includes('pod'))
    return (
      <span className={`${base} bg-info/12 text-info ring-info/25`}>
        <Plane className="h-3 w-3" /> Tourism
      </span>
    )

  if (pt.includes('commercial') || pt.includes('office') || pt.includes('retail'))
    return (
      <span className={`${base} bg-violet/12 text-violet ring-violet/25`}>
        <Building2 className="h-3 w-3" /> Commercial
      </span>
    )

  if (showPending)
    return <span className={`${base} bg-muted text-muted-foreground ring-border`}>Pending</span>

  return null
}
