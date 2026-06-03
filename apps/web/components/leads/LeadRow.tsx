'use client'

import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import CompanyBadge from './CompanyBadge'
import CategoryBadge from './CategoryBadge'
import { fmtValueRange } from '@/lib/format'
import type { Lead } from '@/types'

export default function LeadRow({ lead, showPending = false }: { lead: Lead; showPending?: boolean }) {
  const scoreTone =
    lead.leadScore >= 85 ? 'text-success' :
    lead.leadScore >= 70 ? 'text-warning' :
    'text-muted-foreground'

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/60"
    >
      {/* Score */}
      <div className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-muted ring-1 ring-border">
        <span className={`text-base font-bold leading-none tabular-nums ${scoreTone}`}>{lead.leadScore}</span>
        <span className="mt-0.5 text-[8px] font-medium uppercase tracking-wider text-muted-foreground">score</span>
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
          <span className="text-sm font-semibold text-primary">{fmtValueRange(lead.estimatedValue)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  )
}
