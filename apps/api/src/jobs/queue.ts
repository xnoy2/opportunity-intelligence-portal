import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

export const scraperQueue = new Queue('scrapers', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 }, // retry after 1min, 2min, 4min
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
})

export const classifierQueue = new Queue('classifier', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10_000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
})
