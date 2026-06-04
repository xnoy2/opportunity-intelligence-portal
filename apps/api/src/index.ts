import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '../../.env') })

import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { prismaPlugin } from './plugins/prisma.js'
import { authRoutes } from './routes/auth.js'
import { leadsRoutes } from './routes/leads.js'
import { pipelineRoutes } from './routes/pipeline.js'
import { ghlRoutes } from './routes/ghl.js'
import { startScheduler } from './jobs/scheduler.js'

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
  },
})

async function main() {
  const allowedOrigins = [
    process.env.WEB_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'https://web-production-90ce7.up.railway.app',
  ].filter(Boolean)

  await server.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
  })

  await server.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: '7d' },
  })

  await server.register(prismaPlugin)

  await server.register(authRoutes, { prefix: '/auth' })
  await server.register(leadsRoutes, { prefix: '/leads' })
  await server.register(pipelineRoutes, { prefix: '/pipeline' })
  await server.register(ghlRoutes, { prefix: '/ghl' })

  server.get('/health', async () => ({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))

  const port = Number(process.env.PORT) || 3001
  await server.listen({ port, host: '0.0.0.0' })
  server.log.info(`API listening on port ${port}`)

  startScheduler()

  // Start BullMQ workers in-process — scraper + classifier run alongside the API
  await import('./jobs/worker.js')
  server.log.info('BullMQ workers started')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
