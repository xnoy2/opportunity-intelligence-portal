'use client'

import { CheckCircle2, Gem, Plane, Building2 } from 'lucide-react'

interface Props {
  projectType: string | null
  dateApproved: string | null
  score: number
  showPending?: boolean
}

export default function CategoryBadge({ projectType, dateApproved, score, showPending = false }: Props) {
  const base = 'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium'

  if (dateApproved)
    return <span className={`${base} bg-success/15 text-success`}><CheckCircle2 className="h-3 w-3" /> Approved</span>

  if (score >= 85)
    return <span className={`${base} bg-warning/15 text-warning`}><Gem className="h-3 w-3" /> High Value</span>

  const pt = (projectType ?? '').toLowerCase()
  if (pt.includes('tourism') || pt.includes('holiday') || pt.includes('glamping') || pt.includes('pod'))
    return <span className={`${base} bg-info/15 text-info`}><Plane className="h-3 w-3" /> Tourism</span>

  if (pt.includes('commercial') || pt.includes('office') || pt.includes('retail'))
    return <span className={`${base} bg-violet/15 text-violet`}><Building2 className="h-3 w-3" /> Commercial</span>

  if (showPending)
    return <span className={`${base} bg-muted text-muted-foreground`}>Pending</span>

  return null
}
