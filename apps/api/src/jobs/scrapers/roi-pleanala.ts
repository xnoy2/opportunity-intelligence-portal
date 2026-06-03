/**
 * ROI Appeals Board Scraper — pleanala.ie
 *
 * Uses the public ArcGIS Feature Server API.
 * Data has a ~2 month lag (updated weekly by An Coimisiún Pleanála).
 * Licensed CC-BY-4.0.
 *
 * Endpoint: https://services-eu1.arcgis.com/o56BSnENmD5mYs3j/arcgis/rest/services/Cases_2016_Onwards/FeatureServer/3
 */

import { prisma } from '@bcf/db'
import { makeQueue } from '../queue.js'

const ARCGIS_URL =
  'https://services-eu1.arcgis.com/o56BSnENmD5mYs3j/arcgis/rest/services/Cases_2016_Onwards/FeatureServer/3/query'

const PORTAL_BASE = 'https://www.pleanala.ie/en-ie/case'

interface PleanalaCase {
  OBJECTID:    number
  ABPCASEID:   string
  DEVDESC:     string | null
  DEVADDRESS:  string | null
  LODGEDON:    number | null   // epoch ms
  DECISION:    string | null
  DECIDED_ON:  number | null   // epoch ms
  LINKABPWEB:  string | null
  CATEGORY:    string | null
  PLANINGATY:  string | null
}

function epochToDate(ms: number | null): Date | undefined {
  if (!ms) return undefined
  return new Date(ms)
}

async function fetchCases(params: URLSearchParams): Promise<PleanalaCase[]> {
  params.set('f', 'json')
  params.set('outFields', 'OBJECTID,ABPCASEID,DEVDESC,DEVADDRESS,LODGEDON,DECISION,DECIDED_ON,LINKABPWEB,CATEGORY,PLANINGATY')

  const res = await fetch(`${ARCGIS_URL}?${params}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0)' },
  })

  if (!res.ok) throw new Error(`ArcGIS returned ${res.status}`)

  const data = await res.json() as { features?: { attributes: PleanalaCase }[] }
  return (data.features ?? []).map(f => f.attributes)
}

export async function scrapeROIPleanala(daysBack = 90): Promise<{ found: number; inserted: number }> {
  console.log(`[roi-pleanala] Scraping An Coimisiún Pleanála (last ${daysBack} days from most recent data)`)

  // Data has ~2 month lag — query relative to now but use a generous window
  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000

  const params = new URLSearchParams({
    where:         `LODGEDON > ${cutoff}`,
    orderByFields: 'LODGEDON DESC',
    resultRecordCount: '2000',
  })

  let cases: PleanalaCase[]
  try {
    cases = await fetchCases(params)
  } catch (err) {
    // If no recent results (data lag), fetch by most recent OBJECTID
    console.warn('[roi-pleanala] Date filter returned 0, falling back to OBJECTID range')
    const countRes = await fetch(`${ARCGIS_URL}?where=1=1&returnCountOnly=true&f=json`)
    const countData = await countRes.json() as { count: number }
    const maxId = countData.count

    const fallbackParams = new URLSearchParams({
      where:         `OBJECTID > ${Math.max(0, maxId - 200)}`,
      orderByFields: 'OBJECTID DESC',
      resultRecordCount: '200',
    })
    cases = await fetchCases(fallbackParams)
  }

  // If date filter returns 0 (lag), use OBJECTID fallback
  if (cases.length === 0) {
    console.log('[roi-pleanala] No results from date filter — using OBJECTID fallback')
    const countRes = await fetch(`${ARCGIS_URL}?where=1%3D1&returnCountOnly=true&f=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BCFPortal/1.0)' },
    })
    const countData = await countRes.json() as { count: number }
    const maxId = countData.count

    const fallbackParams = new URLSearchParams({
      where:         `OBJECTID > ${Math.max(0, maxId - 300)}`,
      orderByFields: 'OBJECTID DESC',
    })
    cases = await fetchCases(fallbackParams)
  }

  console.log(`[roi-pleanala] Fetched ${cases.length} cases`)

  let inserted = 0
  const classifierQ = makeQueue('classifier')

  for (const c of cases) {
    const planningRef = `PLEANALA-${c.ABPCASEID}`

    const existing = await prisma.lead.findUnique({
      where: { planningRef },
      select: { id: true },
    })
    if (existing) continue

    const lead = await prisma.lead.create({
      data: {
        planningRef,
        description:        c.DEVDESC ?? undefined,
        location:           c.DEVADDRESS ?? undefined,
        dateSubmitted:      epochToDate(c.LODGEDON),
        dateApproved:       c.DECIDED_ON ? epochToDate(c.DECIDED_ON) : undefined,
        sourceUrl:          c.LINKABPWEB ?? `${PORTAL_BASE}/${c.ABPCASEID}`,
        sourceRegion:       'ROI',
        intelligenceSource: 'planning',
      },
    })

    await classifierQ.add('classify', { leadId: lead.id })
    inserted++
  }

  console.log(`[roi-pleanala] Inserted ${inserted} new leads`)
  return { found: cases.length, inserted }
}
