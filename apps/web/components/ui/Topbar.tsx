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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-background/85 px-6 backdrop-blur-md">
      <div>
        <h1 className="text-[22px] font-normal leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && (
          <div className="ml-1 hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">{user.name ?? user.email}</p>
            <p className="text-xs leading-tight text-muted-foreground">{user.company} · {user.role}</p>
          </div>
        )}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-medium text-primary-on-container">
          {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  )
}
