/**
 * England Planning Scraper — planning.data.gov.uk
 *
 * Official DLUHC open data API. Open Government Licence.
 * Covers 300+ English LPAs. Returns JSON directly.
 * Data has ~weeks lag depending on LPA upload schedule.
 *
 * API: https://www.planning.data.gov.uk/entity.json?dataset=planning-application
 */

import { prisma } from '@bcf/db'
import { makeQueue, addClassifyJob } from '../queue.js'

const BASE = 'https://www.planning.data.gov.uk/entity.json'
const PAGE_SIZE = 100

interface EnglandEntity {
  entity:                 number
  reference:              string
  description:            string
  'entry-date':           string
  'decision-date':        string
  'organisation-entity':  string
  point:                  string   // WKT "POINT (lon lat)" or ""
  name:                   string
}

interface APIResponse {
  count:    number
  entities: EnglandEntity[]
  links:    { next?: string }
}

/** Parse WKT point "POINT (lon lat)" → { lat, lng } or null */
function parsePoint(wkt: string | undefined): { lat: number; lng: number } | null {
  if (!wkt) return null
  const m = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/)
  if (!m) return null
  return { lng: parseFloat(m[1]), lat: parseFloat(m[2]) }
}

export async function scrapeEngland(daysBack = 14): Promise<{ found: number; inserted: number }> {
  // Find the most recent entry-date we already have for England
  const latest = await prisma.lead.findFirst({
    where:   { sourceRegion: 'ENGLAND' },
    orderBy: { dateSubmitted: 'desc' },
    select:  { dateSubmitted: true },
  })

  const since = latest?.dateSubmitted
    ?? new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

  const dateMin = since.toISOString().split('T')[0]

  console.log(`[england] Fetching planning applications since ${dateMin}`)

  let total = 0
  let inserted = 0
  let offset = 0
  const classifierQ = makeQueue('classifier')

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const params = new URLSearchParams({
      dataset:             'planning-application',
      'entry-date-minimum': dateMin,
      limit:               String(PAGE_SIZE),
      offset:              String(offset),
    })

    const res = await fetch(`${BASE}?${params}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'BCFPortal/1.0' },
    })

    if (!res.ok) throw new Error(`planning.data.gov.uk returned ${res.status}`)

    const data = await res.json() as APIResponse
    total = data.count

    if (!data.entities.length) break

    console.log(`[england] Page offset=${offset} — ${data.entities.length} entities (total: ${total})`)

    for (const e of data.entities) {
      if (!e.reference || !e.description) continue

      const planningRef = `ENG-${e['organisation-entity']}-${e.reference.replace(/\//g, '-')}`

      const existing = await prisma.lead.findUnique({
        where:  { planningRef },
        select: { id: true },
      })
      if (existing) continue

      const coords = parsePoint(e.point)

      const lead = await prisma.lead.create({
        data: {
          planningRef,
          description:         e.description || undefined,
          dateSubmitted:       e['entry-date']    ? new Date(e['entry-date'])    : undefined,
          dateApproved:        e['decision-date'] ? new Date(e['decision-date']) : undefined,
          sourceUrl:           `https://www.planning.data.gov.uk/entity/${e.entity}`,
          sourceRegion:        'ENGLAND',
          intelligenceSource:  'planning',
          ...(coords && { latitude: coords.lat, longitude: coords.lng }),
        },
      })

      await addClassifyJob(classifierQ, lead.id)
      inserted++
    }

    // Stop if we've processed all pages or hit 2000 records per run (rate limit)
    offset += PAGE_SIZE
    if (offset >= Math.min(total, 2000)) break

    // Polite delay
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`[england] Complete: ${total} total, ${inserted} new leads inserted`)
  return { found: Math.min(total, 2000), inserted }
}
