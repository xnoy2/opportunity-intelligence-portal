import fp from 'fastify-plugin'
import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '@bcf/db'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async server => {
  await prisma.$connect()
  server.decorate('prisma', prisma)
  server.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

export { prismaPlugin }
