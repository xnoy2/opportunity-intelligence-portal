import { Queue } from 'bullmq'
import IORedis from 'ioredis'

let _connection: IORedis | undefined

/** Returns a shared Redis connection, created on first call (after dotenv is loaded). */
export function getConnection(): IORedis {
  if (!_connection) {
    if (!process.env.REDIS_URL) throw new Error('REDIS_URL is not set')
    _connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return _connection
}

/** Create a BullMQ queue — call this after env is loaded. */
export function makeQueue(name: string) {
  return new Queue(name, {
    connection: getConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  })
}
