/**
 * NI Planning Register scraper — uses the TerraQuest JSON API directly.
 *
 * API discovered from __ENV.js on planningregister.planningsystemni.gov.uk
 * Base: https://api-planningregister-planningportal.pr.tqinfra.co.uk/api/v1
 * Tenant: cfb86436-414d-4459-9545-93eec37615a2 (from NEXT_APP_PP_TENANT_ID)
 *
 * SearchTerm is required (min 1 char). "e" appears in virtually all NI
 * planning descriptions so acts as a broad "get all" query.
 */

import { prisma } from '@bcf/db'
import { makeQueue, addClassifyJob } from '../queue.js'

const API_BASE   = 'https://api-planningregister-planningportal.pr.tqinfra.co.uk/api/v1'
const TENANT_ID  = 'cfb86436-414d-4459-9545-93eec37615a2'
const PORTAL_URL = 'https://planningregister.planningsystemni.gov.uk'
const RATE_MS    = 1500

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface NIApplication {
  applicationId: number
  applicationReferenceNumber: string
  siteAddress: string
  dateReceived: string
  decisionDate: string | null
  proposalText: string
  applicationStatus: string
  decisionType: string | null
  applicationType: string
  authority: string
  applicantName: string
  authorityId: number
}

interface SearchResponse {
  applications: { items: NIApplication[] }
}

interface Pagination {
  totalCount: number
  pageSize: number
  currentPage: number
  totalPages: number
  nextPageLink: string | null
}

async function fetchPage(params: URLSearchParams): Promise<{ items: NIApplication[]; pagination: Pagination }> {
  const url = `${API_BASE}/applications?${params}`

  const res = await fetch(url, {
    headers: {
      'Accept':     'application/json',
      'TQ-Tenant':  TENANT_ID,
      'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0)',
    },
  })

  if (!res.ok) throw new Error(`API returned ${res.status} for ${url}`)

  const paginationHeader = res.headers.get('X-Pagination')
  const pagination: Pagination = paginationHeader
    ? JSON.parse(paginationHeader)
    : { totalCount: 0, pageSize: 50, currentPage: 1, totalPages: 1, nextPageLink: null }

  const body = await res.json() as SearchResponse
  return { items: body.applications?.items ?? [], pagination }
}

export async function scrapeNI(daysBack = 7): Promise<{ found: number; inserted: number }> {
  const dateTo   = new Date()
  const dateFrom = new Date(Date.now() - daysBack * 86_400_000)

  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`

  const baseParams = new URLSearchParams({
    SearchTerm:        'e',  // 1-char broad match — appears in nearly all NI descriptions
    SearchStatus:      'All',
    SortBy:            'DateReceived',
    SortByDescending:  'True',
    SearchType:        'Basic',
    DateFrom:          fmt(dateFrom),
    DateTo:            fmt(dateTo),
    PageSize:          '50',
  })

  const allApplications: NIApplication[] = []
  let page = 1
  let totalPages = 1

  console.log(`[ni-scraper] Fetching NI planning applications from ${fmt(dateFrom)} to ${fmt(dateTo)}`)

  while (page <= totalPages) {
    const params = new URLSearchParams(baseParams)
    params.set('PageNumber', String(page))

    console.log(`[ni-scraper] Page ${page}/${totalPages}`)

    const { items, pagination } = await fetchPage(params)
    allApplications.push(...items)
    totalPages = pagination.totalPages

    if (page < totalPages) await sleep(RATE_MS)
    page++
  }

  console.log(`[ni-scraper] Fetched ${allApplications.length} applications (${totalPages} pages)`)

  let inserted = 0
  const classifierQ = makeQueue('classifier')

  // NI postcode regex: BT followed by 1-2 digits, space, digit, 2 letters
  const postcodeRe = /\bBT\d{1,2}\s?\d[A-Z]{2}\b/i

  for (const app of allApplications) {
    const existing = await prisma.lead.findUnique({
      where: { planningRef: app.applicationReferenceNumber },
      select: { id: true },
    })

    if (existing) continue

    const lead = await prisma.lead.create({
      data: {
        planningRef:        app.applicationReferenceNumber,
        description:        app.proposalText,
        location:           app.siteAddress.replace(/\r\n/g, ', ').replace(/\n/g, ', '),
        postcode:           app.siteAddress.match(postcodeRe)?.[0]?.toUpperCase() || undefined,
        applicantName:      app.applicantName || undefined,
        dateSubmitted:      app.dateReceived ? new Date(app.dateReceived) : undefined,
        dateApproved:       app.decisionDate ? new Date(app.decisionDate) : undefined,
        sourceUrl:          `${PORTAL_URL}/application/${app.applicationReferenceNumber}`,
        sourceRegion:       'NI',
        intelligenceSource: 'planning',
      },
    })

    await addClassifyJob(classifierQ, lead.id)
    inserted++

    await sleep(200)
  }

  console.log(`[ni-scraper] Inserted ${inserted} new leads, queued for classification`)
  return { found: allApplications.length, inserted }
}
