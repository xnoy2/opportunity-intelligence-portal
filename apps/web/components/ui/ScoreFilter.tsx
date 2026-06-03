'use client'

interface Props {
  value: number
  onChange: (v: number) => void
  className?: string
}

// Granular score bands covering the full active range (many real leads score 8–42)
const OPTIONS: { value: number; label: string }[] = [
  { value: 0,  label: 'Any score' },
  { value: 85, label: 'Score 85+' },
  { value: 70, label: 'Score 70+' },
  { value: 50, label: 'Score 50+' },
  { value: 30, label: 'Score 30+' },
  { value: 10, label: 'Score 10+' },
]

export default function ScoreFilter({ value, onChange, className = '' }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className={`bg-navy border border-navy-border text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold/50 ${className}`}
    >
      {OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
