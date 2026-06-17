'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Target, KanbanSquare, Map, LogOut } from 'lucide-react'
import { logout } from '@/lib/auth'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads',     label: 'Leads',     icon: Target },
  { href: '/pipeline',  label: 'Pipeline',  icon: KanbanSquare },
  { href: '/map',       label: 'Map',       icon: Map },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col bg-card">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-e1">
          B
        </span>
        <div>
          <p className="text-base font-medium leading-tight text-foreground">Leads Portal</p>
          <p className="text-xs leading-tight text-muted-foreground">Opportunity Intelligence</p>
        </div>
      </div>

      {/* Nav — MD3 drawer items with pill active indicator */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`state-layer flex h-14 items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-container text-primary-on-container'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4">
        <button
          onClick={logout}
          className="state-layer flex h-14 w-full items-center gap-3 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-danger"
        >
          <LogOut className="h-[22px] w-[22px]" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
