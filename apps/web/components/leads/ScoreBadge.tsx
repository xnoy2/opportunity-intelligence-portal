'use client'

interface Props { score: number; size?: 'sm' | 'lg' }

export default function ScoreBadge({ score, size = 'sm' }: Props) {
  const tone =
    score >= 85 ? 'bg-success/12 text-success ring-success/25' :
    score >= 70 ? 'bg-warning/12 text-warning ring-warning/25' :
    'bg-muted text-muted-foreground ring-border'

  const dims = size === 'lg' ? 'h-12 w-12 text-lg rounded-xl' : 'h-9 w-10 text-sm rounded-lg'

  return (
    <span className={`inline-flex items-center justify-center font-bold ring-1 tabular-nums ${dims} ${tone}`}>
      {score}
    </span>
  )
}
