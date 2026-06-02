import type { Lead, LeadsResponse, StatsResponse, PipelineNote, ScrapeLog, User } from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('bcf_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bcf_token')
      localStorage.removeItem('bcf_user')
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('bcf_token', data.token)
  localStorage.setItem('bcf_user', JSON.stringify(data.user))
  return data
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me')
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface LeadFilters {
  status?: string
  company?: string
  minScore?: number
  region?: string
  category?: string
  unactioned?: boolean
  limit?: number
  offset?: number
}

export async function getLeads(filters: LeadFilters = {}): Promise<LeadsResponse> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => v !== undefined && params.set(k, String(v)))
  return request<LeadsResponse>(`/leads?${params}`)
}

export async function getLead(id: string): Promise<Lead> {
  return request<Lead>(`/leads/${id}`)
}

export async function getStats(): Promise<StatsResponse> {
  return request<StatsResponse>('/leads/stats')
}

export async function updateLeadStatus(id: string, status: string): Promise<Lead> {
  return request<Lead>(`/leads/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function addNote(leadId: string, note: string): Promise<PipelineNote> {
  return request<PipelineNote>('/pipeline/notes', {
    method: 'POST',
    body: JSON.stringify({ leadId, note }),
  })
}

export async function getScrapeLogs(): Promise<ScrapeLog[]> {
  return request<ScrapeLog[]>('/pipeline/scrape-logs')
}

export async function triggerScrape(source = 'ni'): Promise<{ queued: boolean; source: string }> {
  return request('/pipeline/scrape', { method: 'POST', body: JSON.stringify({ source }) })
}

export async function triggerReclassify(): Promise<{ queued: number }> {
  return request('/pipeline/reclassify', { method: 'POST', body: '{}' })
}
