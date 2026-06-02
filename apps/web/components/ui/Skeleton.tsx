'use client'

interface Props { className?: string }

export default function Skeleton({ className = '' }: Props) {
  return <div className={`animate-pulse rounded bg-navy-border ${className}`} />
}

export function SkeletonRow() {
  return (
    <tr className="border-b border-navy-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-navy-card border border-navy-border rounded-lg p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}
