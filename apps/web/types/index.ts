export type LeadStatus =
  | 'NEW' | 'REVIEWED' | 'CONTACTED' | 'QUOTE_SENT'
  | 'FOLLOW_UP' | 'NEGOTIATION' | 'WON' | 'LOST'

export type Company = 'BGR' | 'BWDS' | 'BCF' | 'MULTIPLE'
export type UserRole = 'ADMIN' | 'STAFF'

export interface Lead {
  id: string
  planningRef: string
  projectType: string | null
  description: string | null
  location: string | null
  postcode: string | null
  applicantName: string | null
  dateSubmitted: string | null
  dateApproved: string | null
  status: LeadStatus
  assignedCompany: Company | null
  leadScore: number
  estimatedValue: number | null
  aiSummary: string | null
  suggestedAction: string | null
  sourceRegion: string | null
  sourceUrl: string | null
  intelligenceSource: string
  classifiedAt: string | null
  createdAt: string
  updatedAt: string
  notes?: PipelineNote[]
}

export interface PipelineNote {
  id: string
  leadId: string
  note: string
  author: string
  createdAt: string
}

export interface ScrapeLog {
  id: string
  source: string
  leadsFound: number
  leadsNew: number
  status: string
  error: string | null
  durationMs: number | null
  runAt: string
}

export interface User {
  id: string
  email: string
  name: string | null
  company: Company
  role: UserRole
}

export interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

export interface StatsResponse {
  newToday: number
  newThisWeek: number
  highValue: number
  approved: number
  activePipeline: number
  pipelineValue: number
  byCompany: Record<string, number>
  tourism: number
  farmDiv: number
  unactioned: number
  lastScrape: string | null
}

export type LeadCategory = 'all' | 'approved' | 'high_value' | 'tourism' | 'commercial'

export interface MapLead {
  id: string
  planningRef: string
  projectType: string | null
  location: string | null
  status: LeadStatus
  assignedCompany: Company | null
  leadScore: number
  estimatedValue: number | null
  latitude: number
  longitude: number
  sourceRegion: string | null
  dateSubmitted: string | null
}
