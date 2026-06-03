'use client'

interface Props { score: number; size?: 'sm' | 'lg' }

export default function ScoreBadge({ score, size = 'sm' }: Props) {
  const tone =
    score >= 85 ? 'bg-success/15 text-success' :
    score >= 70 ? 'bg-warning/15 text-warning' :
    'bg-muted text-muted-foreground'

  const dims = size === 'lg' ? 'h-14 w-14 text-xl rounded-2xl' : 'h-10 w-10 text-sm rounded-xl'

  return (
    <span className={`inline-flex items-center justify-center font-medium tabular-nums ${dims} ${tone}`}>
      {score}
    </span>
  )
}
