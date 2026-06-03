/**
 * ROI Planning Scraper — eplanning.ie
 *
 * eplanning.ie is an ASP.NET MVC system operated by LGMA covering ~25 Irish councils.
 * Data requires: session cookie + CSRF token from GET, then POST to searchresults.
 * Results are HTML table — no JSON API available.
 *
 * Cork City/County use planning.agileapplications.ie (separate system, not yet implemented).
 */

import * as cheerio from 'cheerio'
import { prisma } from '@bcf/db'
import { makeQueue, addClassifyJob } from '../queue.js'

const BASE = 'https://www.eplanning.ie'
const RATE_MS = 2000
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// All councils on eplanning.ie (Cork uses a different system)
const COUNCILS = [
  'CarlowCC', 'CavanCC', 'ClareCC', 'DonegalCC', 'GalwayCC', 'GalwayCity',
  'KerryCC', 'KildareCC', 'KilkennyCC', 'LaoisCC', 'LeitrimCC', 'LimerickCCC',
  'LongfordCC', 'LouthCC', 'MayoCC', 'MeathCC', 'MonaghanCC', 'OffalyCC',
  'RoscommonCC', 'SligoCC', 'TipperaryCC', 'WaterfordCC', 'WestmeathCC',
  'WexfordCC', 'WicklowCC',
]

interface FormFields {
  token: string
  id: string
  councilName: string
}

async function getFormFields(council: string): Promise<FormFields | null> {
  try {
    const res = await fetch(`${BASE}/${council}/SearchListing/RECEIVED`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0)',
        'Accept': 'text/html',
      },
    })
    if (!res.ok) return null

    const html = await res.text()
    const $ = cheerio.load(html)

    // Get the search form CSRF token (second form on the page)
    const tokens = $('input[name="__RequestVerificationToken"]').map((_, el) => $(el).val()).get()
    const token = tokens[tokens.length - 1] as string
    if (!token) return null

    const id = ($('#CheckBoxList_0__Id').val() as string) ?? '0'
    const councilName = ($('#CheckBoxList_0__Name').val() as string) ?? council

    // Store the session cookie
    const setCookie = res.headers.get('set-cookie') ?? ''
    // We'll need to re-use the cookie — store on the fetch call below

    return { token, id, councilName }
  } catch {
    return null
  }
}

interface SessionData {
  token: string
  cookies: string
  id: string
  councilName: string
}

async function getSessionAndFields(council: string): Promise<SessionData | null> {
  try {
    const res = await fetch(`${BASE}/${council}/SearchListing/RECEIVED`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })
    if (!res.ok) return null

    const rawCookies = res.headers.getSetCookie?.() ?? []
    const cookies = rawCookies.map(c => c.split(';')[0]).join('; ')
    const html = await res.text()
    const $ = cheerio.load(html)

    const tokens = $('input[name="__RequestVerificationToken"]').map((_, el) => $(el).val()).get()
    const token = tokens[tokens.length - 1] as string
    if (!token) return null

    const id = ($('#CheckBoxList_0__Id').val() as string) ?? '0'
    const councilName = ($('#CheckBoxList_0__Name').val() as string) ?? council

    return { token, cookies, id, councilName }
  } catch (err) {
    console.warn(`[roi-eplanning] Failed to get session for ${council}:`, err)
    return null
  }
}

interface ROIApplication {
  fileRef: string
  status: string
  receivedDate: string | null
  applicantName: string
  address: string
  description: string
  authority: string
  detailUrl: string
}

function parseResults(html: string, council: string): ROIApplication[] {
  const $ = cheerio.load(html)
  const applications: ROIApplication[] = []

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 7) return

    const fileRef    = cells.eq(0).text().trim()
    const status     = cells.eq(1).text().trim()
    const receivedTxt = cells.eq(5).text().trim()
    const applicant  = cells.eq(6).text().trim()
    const address    = cells.eq(7).text().replace(/\s+/g, ' ').trim()
    const desc       = cells.eq(8).text().replace(/\s+/g, ' ').trim()
    const authority  = cells.eq(9).text().trim()
    const href       = cells.eq(0).find('a').attr('href') ?? ''

    if (!fileRef || !address) return

    applications.push({
      fileRef:      `${council}-${fileRef}`,
      status,
      receivedDate: parseIrishDate(receivedTxt),
      applicantName: applicant,
      address,
      description:  desc,
      authority:    authority || council,
      detailUrl:    href ? `${BASE}${href}` : `${BASE}/${council}/AppFileRefDetails/${fileRef}/0`,
    })
  })

  return applications
}

function parseIrishDate(text: string): string | null {
  // eplanning.ie uses DD/MM/YYYY format
  const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`  // ISO format
}

async function scrapeCouncil(
  council: string,
  daysBack: number
): Promise<{ found: number; inserted: number }> {
  const session = await getSessionAndFields(council)
  if (!session) {
    console.warn(`[roi-eplanning] Could not get session for ${council}, skipping`)
    return { found: 0, inserted: 0 }
  }

  const { token, cookies, id, councilName } = session

  const body = new URLSearchParams({
    __RequestVerificationToken: token,
    AppStatus:             '0',
    RdoTimeLimit:          String(Math.min(daysBack, 42)),
    SearchType:            'Listing',
    CountyTownCount:       '1',
    CountyTownCouncilNames: `${councilName}:0,`,
    'CheckBoxList[0].Id':      id,
    'CheckBoxList[0].Name':    councilName,
    'CheckBoxList[0].IsSelected': 'true',
  })

  const res = await fetch(`${BASE}/${council}/searchresults`, {
    method: 'POST',
    headers: {
      'User-Agent':   'Mozilla/5.0 (compatible; BCFPortal/1.0)',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer':      `${BASE}/${council}/SearchListing/RECEIVED`,
      'Cookie':       cookies,
    },
    body: body.toString(),
    redirect: 'follow',
  })

  if (!res.ok) {
    console.warn(`[roi-eplanning] HTTP ${res.status} for ${council}`)
    return { found: 0, inserted: 0 }
  }

  const html = await res.text()
  if (html.includes('No results found')) {
    console.log(`[roi-eplanning] No results for ${council}`)
    return { found: 0, inserted: 0 }
  }

  const applications = parseResults(html, council)
  console.log(`[roi-eplanning] ${council}: ${applications.length} applications`)

  let inserted = 0
  const classifierQ = makeQueue('classifier')

  for (const app of applications) {
    const existing = await prisma.lead.findUnique({
      where: { planningRef: app.fileRef },
      select: { id: true },
    })
    if (existing) continue

    const lead = await prisma.lead.create({
      data: {
        planningRef:        app.fileRef,
        description:        app.description || undefined,
        location:           app.address || undefined,
        applicantName:      app.applicantName || undefined,
        dateSubmitted:      app.receivedDate ? new Date(app.receivedDate) : undefined,
        sourceUrl:          app.detailUrl,
        sourceRegion:       'ROI',
        intelligenceSource: 'planning',
      },
    })

    await addClassifyJob(classifierQ, lead.id)
    inserted++
    await sleep(300)
  }

  return { found: applications.length, inserted }
}

export async function scrapeROIEplanning(daysBack = 7): Promise<{ found: number; inserted: number }> {
  console.log(`[roi-eplanning] Starting scrape of ${COUNCILS.length} councils (last ${daysBack} days)`)

  let totalFound = 0
  let totalInserted = 0

  for (const council of COUNCILS) {
    try {
      const result = await scrapeCouncil(council, daysBack)
      totalFound    += result.found
      totalInserted += result.inserted
    } catch (err) {
      console.error(`[roi-eplanning] Error scraping ${council}:`, err)
    }
    await sleep(RATE_MS)
  }

  console.log(`[roi-eplanning] Complete: ${totalFound} found, ${totalInserted} inserted`)
  return { found: totalFound, inserted: totalInserted }
}
