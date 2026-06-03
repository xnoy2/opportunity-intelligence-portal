'use client'

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Variant = 'filled' | 'tonal' | 'outlined' | 'text' | 'fab'

const base =
  'state-layer inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-[0.01em] transition-[box-shadow,background-color,color] focus-ring disabled:pointer-events-none disabled:opacity-50'

const variants: Record<Variant, string> = {
  filled:   'h-10 rounded-full bg-primary px-6 text-sm text-primary-foreground shadow-e1 hover:shadow-e2',
  tonal:    'h-10 rounded-full bg-primary-container px-6 text-sm text-primary-on-container hover:shadow-e1',
  outlined: 'h-10 rounded-full border border-outline px-6 text-sm text-primary',
  text:     'h-10 rounded-full px-4 text-sm text-primary',
  fab:      'h-14 rounded-2xl bg-primary-container px-5 text-sm text-primary-on-container shadow-e3 hover:shadow-e4',
}

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  icon?: LucideIcon
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'filled', loading = false, icon: Icon, className = '', children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : Icon && <Icon className="h-[18px] w-[18px]" />}
      {children}
    </button>
  )
})

export default Button
