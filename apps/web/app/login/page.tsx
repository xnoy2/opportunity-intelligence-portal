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
      {/* Softly floating gradient backdrop */}
      <div className="animate-blob-float pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
      <div className="animate-blob-float pointer-events-none absolute -bottom-48 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-violet/15 blur-3xl [animation-delay:1.5s] [animation-duration:11s]" />

      <div className="absolute right-4 top-4 z-[60]">
        <ThemeToggle />
      </div>

      {/*
        Intro splash — pure CSS so it can never get "stuck": it holds, then
        fades to visibility:hidden via `forwards` fill regardless of any JS.
      */}
      <div className="animate-splash-cover pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="relative flex flex-col items-center">
          {/* Concentric pulsing rings */}
          <span className="animate-ring-pulse absolute top-1 h-[88px] w-[88px] rounded-[1.9rem] bg-primary/30" />
          <span className="animate-ring-pulse absolute top-1 h-[88px] w-[88px] rounded-[1.9rem] bg-primary/20 [animation-delay:0.6s]" />
          {/* Logo */}
          <span className="animate-logo-in relative flex h-[88px] w-[88px] items-center justify-center rounded-[1.9rem] bg-primary text-4xl font-bold text-primary-foreground shadow-e4">
            B
          </span>
          <h1 className="animate-rise mt-7 text-xl font-semibold tracking-tight text-foreground [animation-delay:0.25s]">
            Leads Portal
          </h1>
          <p className="animate-rise text-sm font-medium tracking-wide text-muted-foreground [animation-delay:0.4s]">
            Opportunity Intelligence
          </p>
        </div>
      </div>

      {/* Login content — always rendered, rises in as the splash fades */}
      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="animate-rise mb-8 flex flex-col items-center text-center [animation-delay:0.95s]">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary text-2xl font-bold text-primary-foreground shadow-e3 transition-transform hover:scale-105">
            B
          </span>
          <h1 className="text-xl font-medium text-foreground">Leads Portal</h1>
          <p className="text-sm text-muted-foreground">Opportunity Intelligence</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md-card animate-rise space-y-5 p-6 shadow-e2 [animation-delay:1.05s]"
        >
          <div>
            <h2 className="text-lg font-medium text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="animate-fade-in flex items-center gap-2 rounded-2xl bg-danger/12 px-4 py-3 text-sm text-danger">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* MD3 filled text fields */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="group relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
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
            <div className="group relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
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

        <p className="animate-rise mt-6 text-center text-xs text-muted-foreground [animation-delay:1.15s]">
          BGR · BWDS NI · Ballycastle Climbing Frames
        </p>
      </div>
    </div>
  )
}
