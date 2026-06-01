import { makeQueue } from './queue.js'

export function startScheduler() {
  const scraperQueue = makeQueue('scrapers')

  scraperQueue.add('ni-scraper', { source: 'ni' }, {
    repeat: { pattern: '0 6 * * *' },
    jobId: 'cron:ni-scraper',
  })

  scraperQueue.add('roi-scraper', { source: 'roi' }, {
    repeat: { pattern: '30 6 * * *' },
    jobId: 'cron:roi-scraper',
  })

  console.log('[scheduler] Scraper cron jobs registered')
}

export async function triggerScraper(source: 'ni' | 'roi') {
  const scraperQueue = makeQueue('scrapers')
  await scraperQueue.add(`manual:${source}`, { source }, { priority: 1 })
  console.log(`[scheduler] Manual run queued for ${source}`)
}
