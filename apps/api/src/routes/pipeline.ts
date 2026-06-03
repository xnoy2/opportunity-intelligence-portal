import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, getCompanyFilter } from '../middleware/auth.js'
import { triggerScraper } from '../jobs/scheduler.js'
import { makeQueue } from '../jobs/queue.js'

const noteSchema = z.object({
  leadId: z.string(),
  note: z.string().min(1).max(2000),
})

export const pipelineRoutes: FastifyPluginAsync = async server => {
  server.addHook('preHandler', requireAuth)

  // POST /pipeline/notes — add a note to a lead
  server.post('/notes', async (request, reply) => {
    const body = noteSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const { leadId, note } = body.data
    const companyFilter = getCompanyFilter(request)
    const { email } = request.user

    const lead = await server.prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) return reply.status(404).send({ error: 'Lead not found' })
    if (companyFilter && lead.assignedCompany !== companyFilter) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const created = await server.prisma.pipelineNote.create({
      data: { leadId, note, author: email },
    })

    return created
  })

  // GET /pipeline/scrape-logs — last 20 scrape run summaries
  server.get('/scrape-logs', async () => {
    return server.prisma.scrapeLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 20,
    })
  })

  // POST /pipeline/reclassify — re-queue all unclassified leads (admin only)
  server.post('/reclassify', async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin only' })
    }
    const unclassified = await server.prisma.lead.findMany({
      where: { leadScore: 0, classifiedAt: null },
      select: { id: true, planningRef: true },
    })
    const classifierQ = makeQueue('classifier')
    for (const lead of unclassified) {
      await classifierQ.add('classify', { leadId: lead.id }, { priority: 1 })
    }
    console.log(`[pipeline] Re-queued ${unclassified.length} leads for classification`)
    return { queued: unclassified.length }
  })

  // POST /pipeline/scrape — manually trigger a scraper run (admin only)
  server.post('/scrape', async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin only' })
    }
    const { source = 'ni' } = (request.body ?? {}) as { source?: string }
    if (!['ni', 'roi'].includes(source)) {
      return reply.status(400).send({ error: 'Invalid source' })
    }
    await triggerScraper(source as 'ni' | 'roi')
    return { queued: true, source }
  })
}
