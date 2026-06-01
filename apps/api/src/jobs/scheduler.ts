import { scraperQueue } from './queue.js'

export function startScheduler() {
  // NI planning portal — daily at 06:00
  scraperQueue.add('ni-scraper', { source: 'ni' }, {
    repeat: { pattern: '0 6 * * *' },
    jobId: 'cron:ni-scraper',
  })

  // ROI ePlanning — daily at 06:30 (Phase 2)
  scraperQueue.add('roi-scraper', { source: 'roi' }, {
    repeat: { pattern: '30 6 * * *' },
    jobId: 'cron:roi-scraper',
  })

  console.log('[scheduler] Scraper cron jobs registered')
}

/** Manually trigger a scraper run — useful for testing */
export async function triggerScraper(source: 'ni' | 'roi') {
  await scraperQueue.add(`manual:${source}`, { source }, { priority: 1 })
  console.log(`[scheduler] Manual run queued for ${source}`)
}
