'use client'

import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import CompanyBadge from './CompanyBadge'
import CategoryBadge from './CategoryBadge'
import { fmtValueRange } from '@/lib/format'
import type { Lead } from '@/types'

interface Props {
  lead: Lead
  showPending?: boolean
  selectable?: boolean
  selected?: boolean
  onSelectChange?: (id: string, checked: boolean) => void
}

export default function LeadRow({ lead, showPending = false, selectable = false, selected = false, onSelectChange }: Props) {
  const scoreTone =
    lead.leadScore >= 85 ? 'bg-success/15 text-success' :
    lead.leadScore >= 70 ? 'bg-warning/15 text-warning' :
    'bg-muted text-muted-foreground'

  const inner = (
    <>
      {/* Score */}
      <div className={`flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-2xl ${scoreTone}`}>
        <span className="text-base font-medium leading-none tabular-nums">{lead.leadScore}</span>
        <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider opacity-70">score</span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <CategoryBadge
            projectType={lead.projectType}
            dateApproved={lead.dateApproved}
            score={lead.leadScore}
            showPending={showPending}
          />
        </div>
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          {lead.location ?? lead.planningRef}
        </p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
          <span className="font-mono">{lead.planningRef}</span>
          <span>· {lead.sourceRegion ?? 'NI'}</span>
          {lead.assignedCompany && <CompanyBadge company={lead.assignedCompany} />}
        </p>
      </div>

      {/* Value + chevron */}
      <div className="flex flex-shrink-0 items-center gap-3">
        {lead.estimatedValue ? (
          <span className="text-sm font-medium text-primary">{fmtValueRange(lead.estimatedValue)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </>
  )

  if (selectable) {
    return (
      <div className={`flex items-center transition-colors ${selected ? 'bg-primary-container/40' : ''}`}>
        <label className="flex cursor-pointer items-center self-stretch pl-5 pr-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={e => onSelectChange?.(lead.id, e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-outline accent-primary"
            aria-label={`Select ${lead.planningRef}`}
          />
        </label>
        <Link
          href={`/leads/${lead.id}`}
          className="state-layer flex flex-1 items-center gap-4 py-3.5 pl-2 pr-5 text-foreground transition-colors"
        >
          {inner}
        </Link>
      </div>
    )
  }

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="state-layer flex items-center gap-4 px-5 py-3.5 text-foreground transition-colors"
    >
      {inner}
    </Link>
  )
}
