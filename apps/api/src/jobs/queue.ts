import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

let _connection: Redis | undefined

/** Returns a shared Redis connection, created on first call (after dotenv is loaded). */
export function getConnection(): Redis {
  if (!_connection) {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set')
    _connection = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return _connection
}

/** Create a BullMQ queue — call this after env is loaded. */
export function makeQueue(name: string) {
  return new Queue(name, {
    connection: getConnection() as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  })
}

/**
 * Enqueue a lead for AI classification — ONLY when AUTO_CLASSIFY is enabled.
 *
 * Classification is manual by default (triggered from the dashboard) to cap
 * Anthropic API spend: scrapers add leads to the DB but do not auto-classify.
 * Set AUTO_CLASSIFY=true to restore scrape-time auto-classification.
 */
export async function addClassifyJob(queue: Queue, leadId: string): Promise<void> {
  if (process.env.AUTO_CLASSIFY === 'true') {
    await queue.add('classify', { leadId })
  }
}
