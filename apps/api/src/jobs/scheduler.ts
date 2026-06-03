import { makeQueue } from './queue.js'
import { sendWeeklyDigest } from '../services/digest.js'

export function startScheduler() {
  const q = makeQueue('scrapers')

  // NI planning register — daily 6:00am
  q.add('ni-scraper', { source: 'ni' }, {
    repeat: { pattern: '0 6 * * *' },
    jobId: 'cron:ni-scraper',
  })

  // ROI eplanning.ie (25 councils) — daily 6:30am
  q.add('roi-scraper', { source: 'roi' }, {
    repeat: { pattern: '30 6 * * *' },
    jobId: 'cron:roi-scraper',
  })

  // An Coimisiún Pleanála appeals — weekly Sunday 7:00am (data updated weekly)
  q.add('pleanala-scraper', { source: 'pleanala' }, {
    repeat: { pattern: '0 7 * * 0' },
    jobId: 'cron:pleanala-scraper',
  })

  // England (planning.data.gov.uk) — daily 7:00am
  q.add('england-scraper', { source: 'england' }, {
    repeat: { pattern: '0 7 * * *' },
    jobId: 'cron:england-scraper',
  })

  // DAERA/CAFRE grants — weekly Wednesday 8:00am
  q.add('daera-scraper', { source: 'daera' }, {
    repeat: { pattern: '0 8 * * 3' },
    jobId: 'cron:daera-scraper',
  })

  // Weekly digest email — every Monday 8am
  const now = new Date()
  const msUntilMonday8am = (() => {
    const d = new Date(now)
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7))
    d.setHours(8, 0, 0, 0)
    return d.getTime() - now.getTime()
  })()
  setTimeout(async function weekly() {
    try { await sendWeeklyDigest() } catch (e) { console.error('[scheduler] Digest failed:', e) }
    setTimeout(weekly, 7 * 24 * 60 * 60 * 1000)
  }, msUntilMonday8am)

  console.log('[scheduler] Scraper cron jobs registered (NI daily, ROI daily, Pleanála weekly, Digest Monday 8am)')
}

export async function triggerScraper(source: 'ni' | 'roi' | 'pleanala' | 'england' | 'daera') {
  const q = makeQueue('scrapers')
  await q.add(`manual:${source}`, { source }, { priority: 1 })
  console.log(`[scheduler] Manual run queued for ${source}`)
}
