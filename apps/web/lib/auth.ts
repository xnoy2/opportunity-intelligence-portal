import type { User } from '@/types'

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('bcf_user')
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bcf_token')
}

export function logout() {
  localStorage.removeItem('bcf_token')
  localStorage.removeItem('bcf_user')
  window.location.href = '/login'
}

export function isAuthenticated(): boolean {
  return !!getStoredToken()
}
