'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, AlertCircle } from 'lucide-react'
import { login } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import Button from '@/components/ui/Button'
import ThemeToggle from '@/components/theme/ThemeToggle'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard')
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground shadow-e3">
            B
          </span>
          <h1 className="text-xl font-medium text-foreground">BCF Portal</h1>
          <p className="text-sm text-muted-foreground">Opportunity Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="md-card space-y-5 p-6 shadow-e2">
          <div>
            <h2 className="text-lg font-medium text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* MD3 filled text fields */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="focus-ring w-full rounded-t-lg border-b-2 border-input bg-surface-container py-3 pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-primary"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="focus-ring w-full rounded-t-lg border-b-2 border-input bg-surface-container py-3 pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground transition-colors focus:border-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          BGR · BWDS NI · Ballycastle Climbing Frames
        </p>
      </div>
    </div>
  )
}
