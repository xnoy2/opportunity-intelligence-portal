'use client'

const COMPANIES = [
  { key: '',         label: 'All companies' },
  { key: 'BGR',      label: 'BGR' },
  { key: 'BWDS',     label: 'BWDS' },
  { key: 'BCF',      label: 'BCF' },
  { key: 'MULTIPLE', label: 'Multiple' },
] as const

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function CompanyFilter({ value, onChange, className = '' }: Props) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`focus-ring h-8 rounded-lg border border-input bg-surface-container px-3 text-xs text-foreground focus:border-ring ${className}`}
    >
      {COMPANIES.map(c => (
        <option key={c.key} value={c.key}>{c.label}</option>
      ))}
    </select>
  )
}
