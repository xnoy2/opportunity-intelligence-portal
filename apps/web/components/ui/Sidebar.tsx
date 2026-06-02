'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/auth'

const nav = [
  { href: '/dashboard', label: 'Dashboard',  icon: '▦' },
  { href: '/leads',     label: 'Leads',       icon: '◎' },
  { href: '/pipeline',  label: 'Pipeline',    icon: '⬡' },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-navy-card border-r border-navy-border flex flex-col z-20">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-navy-border">
        <p className="text-gold font-bold text-sm tracking-widest uppercase">BCF Portal</p>
        <p className="text-muted text-xs mt-0.5">Opportunity Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-gold/10 text-gold'
                  : 'text-muted hover:text-white hover:bg-navy-hover'
              }`}
            >
              <span className="text-base w-5 text-center">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-navy-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm text-muted hover:text-white hover:bg-navy-hover transition-colors"
        >
          <span className="w-5 text-center">→</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
