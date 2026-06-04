/**
 * DAERA/CAFRE Grants Intelligence Scraper — Northern Ireland
 *
 * Monitors DAERA grant scheme pages for farm diversification, rural tourism,
 * and rural business development opportunities. These represent investment intent
 * 3-12 months before planning applications are submitted.
 *
 * Sources:
 * - https://www.daera-ni.gov.uk/topics/grants-and-funding
 * - Specific scheme pages for Rural Tourism, FBIS, RMCGS, RBDGS
 */

import * as cheerio from 'cheerio'
import { prisma } from '@bcf/db'
import { makeQueue, addClassifyJob } from '../queue.js'

const DAERA_BASE = 'https://www.daera-ni.gov.uk'

// High-value grant schemes relevant to BGR/BWDS/BCF
const TARGET_PAGES = [
  { path: '/articles/rural-development-grants',    category: 'rural' },
  { path: '/articles/farming-grants',              category: 'farming' },
  { path: '/articles/rural-tourism',               category: 'tourism' },
  { path: '/articles/outdoor-recreation-grants',   category: 'outdoor' },
]

const GRANT_KEYWORDS = [
  'tourism', 'farm', 'rural', 'diversification', 'glamping', 'holiday',
  'accommodation', 'outdoor', 'recreation', 'capital grant', 'micro grant',
  'improvement', 'development', 'cafre', 'fbis', 'rmcgs', 'rbdgs',
]

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface GrantScheme {
  title:       string
  description: string
  url:         string
  category:    string
}

async function fetchGrantSchemes(path: string, category: string): Promise<GrantScheme[]> {
  const url = `${DAERA_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0)', 'Accept': 'text/html' },
  })
  if (!res.ok) return []

  const html = await res.text()
  const $ = cheerio.load(html)
  const schemes: GrantScheme[] = []

  // Extract scheme links and descriptions from the page
  $('a[href]').each((_, el) => {
    const href   = $(el).attr('href') ?? ''
    const title  = $(el).text().trim()

    if (!href.startsWith('/') && !href.startsWith(DAERA_BASE)) return
    if (!title || title.length < 10) return

    const fullUrl = href.startsWith('http') ? href : `${DAERA_BASE}${href}`
    const titleLower = title.toLowerCase()

    // Only include grant-relevant links
    const isRelevant = GRANT_KEYWORDS.some(kw => titleLower.includes(kw))
    if (!isRelevant) return

    // Get surrounding paragraph text as description
    const parent = $(el).closest('li, p, div').first()
    const desc   = parent.text().replace(/\s+/g, ' ').trim().slice(0, 500)

    schemes.push({ title, description: desc || title, url: fullUrl, category })
  })

  return schemes
}

export async function scrapeDaeraGrants(): Promise<{ found: number; inserted: number }> {
  console.log('[daera-grants] Scanning DAERA grant scheme pages')

  const allSchemes: GrantScheme[] = []

  for (const page of TARGET_PAGES) {
    const schemes = await fetchGrantSchemes(page.path, page.category)
    console.log(`[daera-grants] ${page.path}: ${schemes.length} schemes found`)
    allSchemes.push(...schemes)
    await sleep(1500)
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = allSchemes.filter(s => {
    if (seen.has(s.url)) return false
    seen.add(s.url)
    return true
  })

  console.log(`[daera-grants] ${unique.length} unique schemes to process`)

  let inserted = 0
  const classifierQ = makeQueue('classifier')

  for (const scheme of unique) {
    // Use the scheme URL as a stable reference
    const planningRef = `DAERA-GRANT-${scheme.url.split('/').pop()?.slice(0, 50) ?? 'unknown'}`

    const existing = await prisma.lead.findUnique({
      where:  { planningRef },
      select: { id: true },
    })
    if (existing) continue

    const lead = await prisma.lead.create({
      data: {
        planningRef,
        description:         `GRANT SCHEME: ${scheme.title}\n\n${scheme.description}`,
        location:            'Northern Ireland',
        sourceUrl:           scheme.url,
        sourceRegion:        'NI',
        intelligenceSource:  'grants',
        dateSubmitted:       new Date(),
      },
    })

    await addClassifyJob(classifierQ, lead.id)
    inserted++
  }

  console.log(`[daera-grants] Inserted ${inserted} new grant intelligence leads`)
  return { found: unique.length, inserted }
}
