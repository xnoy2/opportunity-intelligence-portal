'use client'

interface Props { score: number }

export default function ScoreBadge({ score }: Props) {
  const color =
    score >= 85 ? 'bg-success/15 text-success border-success/30' :
    score >= 70 ? 'bg-warning/15 text-warning border-warning/30' :
    'bg-white/5 text-muted border-white/10'

  return (
    <span className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-bold border ${color}`}>
      {score}
    </span>
  )
}
