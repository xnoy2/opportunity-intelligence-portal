import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, getCompanyFilter } from '../middleware/auth.js'

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

  // GET /pipeline/recent — last 20 scrape run summaries
  server.get('/scrape-logs', async () => {
    return server.prisma.scrapeLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 20,
    })
  })
}
