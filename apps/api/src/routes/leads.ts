import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, getCompanyFilter } from '../middleware/auth.js'
import type { Company, LeadStatus } from '@bcf/db'

const querySchema = z.object({
  status: z.string().optional(),
  company: z.string().optional(),
  minScore: z.coerce.number().optional(),
  region: z.string().optional(),
  since: z.string().datetime().optional(),
  limit: z.coerce.number().default(50),
  offset: z.coerce.number().default(0),
})

export const leadsRoutes: FastifyPluginAsync = async server => {
  server.addHook('preHandler', requireAuth)

  // GET /leads — filterable list
  server.get('/', async request => {
    const q = querySchema.parse(request.query)
    const companyFilter = getCompanyFilter(request)

    const where = {
      ...(companyFilter && { assignedCompany: companyFilter }),
      ...(q.company && !companyFilter && { assignedCompany: q.company as Company }),
      ...(q.status && { status: q.status as LeadStatus }),
      ...(q.minScore !== undefined && { leadScore: { gte: q.minScore } }),
      ...(q.region && { sourceRegion: q.region }),
      ...(q.since && { createdAt: { gte: new Date(q.since) } }),
    }

    const [leads, total] = await Promise.all([
      server.prisma.lead.findMany({
        where,
        orderBy: { leadScore: 'desc' },
        take: q.limit,
        skip: q.offset,
        select: {
          id: true,
          planningRef: true,
          projectType: true,
          location: true,
          postcode: true,
          status: true,
          assignedCompany: true,
          leadScore: true,
          estimatedValue: true,
          aiSummary: true,
          suggestedAction: true,
          sourceRegion: true,
          dateSubmitted: true,
          dateApproved: true,
          createdAt: true,
        },
      }),
      server.prisma.lead.count({ where }),
    ])

    return { leads, total, limit: q.limit, offset: q.offset }
  })

  // GET /leads/stats — dashboard KPIs
  server.get('/stats', async request => {
    const companyFilter = getCompanyFilter(request)
    const companyWhere = companyFilter ? { assignedCompany: companyFilter } : {}
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [newToday, newThisWeek, highValue, approved, pipeline, byCompanyRaw, tourism, farmDiv] = await Promise.all([
      server.prisma.lead.count({ where: { ...companyWhere, createdAt: { gte: since24h } } }),
      server.prisma.lead.count({ where: { ...companyWhere, createdAt: { gte: since7d } } }),
      server.prisma.lead.count({ where: { ...companyWhere, leadScore: { gte: 85 } } }),
      server.prisma.lead.count({ where: { ...companyWhere, dateApproved: { gte: since7d } } }),
      server.prisma.lead.aggregate({
        where: { ...companyWhere, status: { notIn: ['WON', 'LOST'] } },
        _sum: { estimatedValue: true },
        _count: true,
      }),
      server.prisma.lead.groupBy({
        by: ['assignedCompany'],
        where: companyWhere,
        _count: { id: true },
      }),
      server.prisma.lead.count({
        where: { ...companyWhere, projectType: { contains: 'tourism', mode: 'insensitive' } },
      }),
      server.prisma.lead.count({
        where: { ...companyWhere, projectType: { contains: 'farm', mode: 'insensitive' } },
      }),
    ])

    const byCompany: Record<string, number> = {}
    for (const row of byCompanyRaw) {
      if (row.assignedCompany) byCompany[row.assignedCompany] = row._count.id
    }

    return {
      newToday,
      newThisWeek,
      highValue,
      approved,
      activePipeline: pipeline._count,
      pipelineValue: pipeline._sum.estimatedValue ?? 0,
      byCompany,
      tourism,
      farmDiv,
    }
  })

  // GET /leads/:id — full detail
  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const companyFilter = getCompanyFilter(request)

    const lead = await server.prisma.lead.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: 'desc' } } },
    })

    if (!lead) return reply.status(404).send({ error: 'Not found' })
    if (companyFilter && lead.assignedCompany !== companyFilter) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    return lead
  })

  // PATCH /leads/:id/status — update pipeline stage
  server.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: LeadStatus }
    const companyFilter = getCompanyFilter(request)

    const lead = await server.prisma.lead.findUnique({ where: { id } })
    if (!lead) return reply.status(404).send({ error: 'Not found' })
    if (companyFilter && lead.assignedCompany !== companyFilter) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    const updated = await server.prisma.lead.update({
      where: { id },
      data: { status },
    })

    return updated
  })
}
