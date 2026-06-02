'use client'

import { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/auth'
import type { User } from '@/types'

interface Props { title: string }

export default function Topbar({ title }: Props) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => { setUser(getStoredUser()) }, [])

  return (
    <header className="h-14 border-b border-navy-border bg-navy-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-white font-semibold text-base">{title}</h1>
      <div className="flex items-center gap-3">
        {user && (
          <div className="text-right">
            <p className="text-white text-sm font-medium">{user.name ?? user.email}</p>
            <p className="text-muted text-xs">{user.company} · {user.role}</p>
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold text-xs font-bold">
          {user?.name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>
    </header>
  )
}
