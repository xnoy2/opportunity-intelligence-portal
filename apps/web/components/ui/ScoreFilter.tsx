'use client'

// Priority tiers — how a sales team actually triages leads.
// Ranges (not just minimums) so each tier is a distinct band.
export const SCORE_TIERS = {
  all:  { label: 'All scores',       min: 0,  max: 100 },
  hot:  { label: '🔥 Hot · 85–100',  min: 85, max: 100 },
  warm: { label: 'Warm · 50–84',     min: 50, max: 84  },
  cold: { label: 'Cold · below 50',  min: 0,  max: 49  },
} as const

export type ScoreTier = keyof typeof SCORE_TIERS

interface Props {
  value: ScoreTier
  onChange: (tier: ScoreTier) => void
  className?: string
}

export default function ScoreFilter({ value, onChange, className = '' }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ScoreTier)}
      className={`focus-ring h-8 rounded-lg border border-input bg-surface-container px-3 text-xs text-foreground focus:border-ring ${className}`}
    >
      {(Object.keys(SCORE_TIERS) as ScoreTier[]).map(key => (
        <option key={key} value={key}>{SCORE_TIERS[key].label}</option>
      ))}
    </select>
  )
}
