import * as cheerio from 'cheerio'
import { prisma } from '@bcf/db'
import { makeQueue } from '../queue.js'

const BASE_URL = 'https://planningregister.planningsystemni.gov.uk'
const RATE_LIMIT_MS = 2000

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface RawApplication {
  planningRef: string
  description: string
  location: string
  applicantName?: string
  dateSubmitted?: Date
  sourceUrl: string
}

/** Fetch recent NI planning applications submitted in the last N days */
export async function scrapeNI(daysBack = 7): Promise<{ found: number; inserted: number }> {
  const sinceDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  const formattedDate = sinceDate.toISOString().split('T')[0] // YYYY-MM-DD

  const applications: RawApplication[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = buildSearchUrl(formattedDate, page)
    console.log(`[ni-scraper] Fetching page ${page}: ${url}`)

    const html = await fetchWithRetry(url)
    if (!html) break

    const parsed = parsePage(html, url)
    applications.push(...parsed.applications)

    hasMore = parsed.hasNextPage
    page++

    await sleep(RATE_LIMIT_MS)
  }

  console.log(`[ni-scraper] Fetched ${applications.length} applications`)

  let inserted = 0
  for (const app of applications) {
    const isNew = await upsertApplication(app)
    if (isNew) inserted++
    await sleep(500)
  }

  console.log(`[ni-scraper] Inserted ${inserted} new leads`)
  return { found: applications.length, inserted }
}

function buildSearchUrl(fromDate: string, page: number): string {
  // TODO: verify exact search endpoint and params against live portal
  // The NI planning portal search form submits to this endpoint
  const params = new URLSearchParams({
    startDate: fromDate,
    status: 'all',
    page: String(page),
  })
  return `${BASE_URL}/Search/Results?${params}`
}

function parsePage(html: string, _baseUrl: string): {
  applications: RawApplication[]
  hasNextPage: boolean
} {
  const $ = cheerio.load(html)
  const applications: RawApplication[] = []

  // TODO: verify selectors against live planningregister.planningsystemni.gov.uk
  // Inspect the results table HTML to confirm these class names
  $('.search-result, .planning-result, tr.result').each((_, el) => {
    const row = $(el)

    const planningRef = row.find('.reference, .app-ref, td:nth-child(1)').text().trim()
    const description = row.find('.description, .proposal, td:nth-child(2)').text().trim()
    const location = row.find('.location, .address, td:nth-child(3)').text().trim()
    const applicantName = row.find('.applicant, td:nth-child(4)').text().trim() || undefined
    const dateText = row.find('.date, .submitted-date, td:nth-child(5)').text().trim()
    const detailHref = row.find('a[href*="Reference"]').attr('href') || ''

    if (!planningRef || !description) return

    applications.push({
      planningRef: planningRef.replace(/\s+/g, ''),
      description,
      location,
      applicantName: applicantName || undefined,
      dateSubmitted: parseDate(dateText),
      sourceUrl: detailHref.startsWith('http') ? detailHref : `${BASE_URL}${detailHref}`,
    })
  })

  // Detect pagination — look for a "Next" link
  const hasNextPage = $('a[rel="next"], .pagination .next, a:contains("Next")').length > 0

  return { applications, hasNextPage }
}

function parseDate(text: string): Date | undefined {
  if (!text) return undefined
  const d = new Date(text)
  return isNaN(d.getTime()) ? undefined : d
}

async function upsertApplication(app: RawApplication): Promise<boolean> {
  const existing = await prisma.lead.findUnique({
    where: { planningRef: app.planningRef },
    select: { id: true },
  })

  if (existing) return false

  const lead = await prisma.lead.create({
    data: {
      planningRef: app.planningRef,
      description: app.description,
      location: app.location,
      applicantName: app.applicantName,
      dateSubmitted: app.dateSubmitted,
      sourceUrl: app.sourceUrl,
      sourceRegion: 'NI',
      intelligenceSource: 'planning',
    },
  })

  // Queue for AI classification
  await makeQueue('classifier').add('classify', { leadId: lead.id })

  return true
}

async function fetchWithRetry(url: string, retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0; +https://bcfportal.co.uk)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })

      if (!response.ok) {
        console.warn(`[ni-scraper] HTTP ${response.status} on attempt ${attempt}`)
        if (attempt < retries) await sleep(RATE_LIMIT_MS * attempt)
        continue
      }

      return await response.text()
    } catch (err) {
      console.error(`[ni-scraper] Fetch error attempt ${attempt}:`, err)
      if (attempt < retries) await sleep(RATE_LIMIT_MS * attempt)
    }
  }
  return null
}
