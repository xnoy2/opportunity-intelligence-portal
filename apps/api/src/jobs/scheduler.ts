import { makeQueue } from './queue.js'

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

  console.log('[scheduler] Scraper cron jobs registered (NI daily, ROI daily, Pleanála weekly)')
}

export async function triggerScraper(source: 'ni' | 'roi' | 'pleanala') {
  const q = makeQueue('scrapers')
  await q.add(`manual:${source}`, { source }, { priority: 1 })
  console.log(`[scheduler] Manual run queued for ${source}`)
}
