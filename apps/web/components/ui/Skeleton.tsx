'use client'

interface Props { className?: string }

export default function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="md-card p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function SkeletonLeadRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <Skeleton className="h-12 w-12 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="h-6 w-20 rounded-lg" />
    </div>
  )
}
