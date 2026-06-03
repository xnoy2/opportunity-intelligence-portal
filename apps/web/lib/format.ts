/** Compact currency, e.g. £45k, £1.2M */
export function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`
  return `£${n}`
}

/** Estimated value range from a point estimate, e.g. £30k–£56k */
export function fmtValueRange(n: number): string {
  const lo = Math.round((n * 0.75) / 1000) * 1000
  const hi = Math.round((n * 1.4) / 1000) * 1000
  const f = (v: number) => (v >= 1000 ? `£${v / 1000}k` : `£${v}`)
  return `${f(lo)}–${f(hi)}`
}

/** Pipeline total, e.g. £1.2M or £340k+ */
export function fmtPipeline(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `£${Math.round(n / 1000)}k+`
  return `£${n}`
}

/** "Today 14:32" or "3 Jun, 14:32" */
export function fmtLastScan(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
