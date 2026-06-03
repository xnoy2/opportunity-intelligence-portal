'use client'

import { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/auth'
import ThemeToggle from '@/components/theme/ThemeToggle'
import type { User } from '@/types'

interface Props { title: string; subtitle?: string }

export default function Topbar({ title, subtitle }: Props) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => { setUser(getStoredUser()) }, [])

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && (
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">{user.name ?? user.email}</p>
            <p className="text-xs leading-tight text-muted-foreground">{user.company} · {user.role}</p>
          </div>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/25">
          {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  )
}
