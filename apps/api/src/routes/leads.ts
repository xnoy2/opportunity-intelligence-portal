import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, getCompanyFilter } from '../middleware/auth.js'
import { syncStatusToGHL } from '../services/ghl.js'
import type { Company, LeadStatus } from '@bcf/db'

const querySchema = z.object({
  status:     z.string().optional(),
  company:    z.string().optional(),
  minScore:   z.coerce.number().optional(),
  maxScore:   z.coerce.number().optional(),
  region:     z.string().optional(),
  since:      z.string().datetime().optional(),
  category:   z.enum(['approved', 'high_value', 'tourism', 'commercial']).optional(),
  unactioned: z.coerce.boolean().optional(),
  limit:      z.coerce.number().default(50),
  offset:     z.coerce.number().default(0),
})

function categoryWhere(category: string | undefined) {
  const icontains = (s: string) => ({ contains: s, mode: 'insensitive' as const })
  switch (category) {
    case 'approved':   return { dateApproved: { not: null } }
    case 'high_value': return { leadScore: { gte: 85 } }
    case 'tourism':    return { OR: [
      { projectType: icontains('tourism') },
      { projectType: icontains('glamping') },
      { projectType: icontains('holiday') },
      { projectType: icontains('short term let') },
      { projectType: icontains('accommodation') },
      { projectType: icontains('pod') },
      { projectType: icontains('lodge') },
      { projectType: icontains('bothy') },
    ]}
    case 'commercial': return { OR: [
      { projectType: icontains('commercial') },
      { projectType: icontains('office') },
      { projectType: icontains('retail') },
      { projectType: icontains('industrial') },
      { projectType: icontains('mixed use') },
    ]}
    default:           return {}
  }
}

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
      ...((q.minScore !== undefined || q.maxScore !== undefined) && {
        leadScore: {
          ...(q.minScore !== undefined && { gte: q.minScore }),
          ...(q.maxScore !== undefined && { lte: q.maxScore }),
        },
      }),
      ...(q.region && { sourceRegion: q.region }),
      ...(q.since && { createdAt: { gte: new Date(q.since) } }),
      ...categoryWhere(q.category),
      ...(q.unactioned && { status: { in: ['NEW', 'REVIEWED'] as LeadStatus[] } }),
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
    const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [newToday, newThisWeek, highValue, approved, pipeline,
           byCompanyRaw, tourism, farmDiv, unactioned, lastScrape] = await Promise.all([
      server.prisma.lead.count({ where: { ...companyWhere, createdAt: { gte: since24h } } }),
      server.prisma.lead.count({ where: { ...companyWhere, createdAt: { gte: since7d } } }),
      server.prisma.lead.count({ where: { ...companyWhere, leadScore: { gte: 85 } } }),
      server.prisma.lead.count({ where: { ...companyWhere, dateApproved: { not: null } } }),
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
        where: { ...companyWhere, OR: [
          { projectType: { contains: 'tourism',       mode: 'insensitive' } },
          { projectType: { contains: 'glamping',      mode: 'insensitive' } },
          { projectType: { contains: 'holiday',       mode: 'insensitive' } },
          { projectType: { contains: 'short term let',mode: 'insensitive' } },
          { projectType: { contains: 'accommodation', mode: 'insensitive' } },
          { projectType: { contains: 'bothy',         mode: 'insensitive' } },
        ]},
      }),
      server.prisma.lead.count({
        where: { ...companyWhere, projectType: { contains: 'farm', mode: 'insensitive' } },
      }),
      server.prisma.lead.count({
        where: { ...companyWhere, status: { in: ['NEW', 'REVIEWED'] } },
      }),
      server.prisma.scrapeLog.findFirst({
        where: { status: 'success' },
        orderBy: { runAt: 'desc' },
        select: { runAt: true, source: true },
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
      pipelineValue:  pipeline._sum.estimatedValue ?? 0,
      byCompany,
      tourism,
      farmDiv,
      unactioned,
      lastScrape: lastScrape?.runAt ?? null,
    }
  })

  // GET /leads/map — geocoded leads for the interactive map
  server.get('/map', async request => {
    const companyFilter = getCompanyFilter(request)
    const where = {
      ...(companyFilter && { assignedCompany: companyFilter }),
      latitude:  { not: null },
      longitude: { not: null },
    }
    const leads = await server.prisma.lead.findMany({
      where,
      orderBy: { leadScore: 'desc' },
      take: 500,
      select: {
        id: true, planningRef: true, projectType: true,
        location: true, status: true, assignedCompany: true,
        leadScore: true, estimatedValue: true,
        latitude: true, longitude: true,
        sourceRegion: true, dateSubmitted: true,
      },
    })
    return leads
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

    // Sync pipeline stage to GHL if this lead has a GHL contact
    if (lead.ghlContactId && lead.assignedCompany) {
      syncStatusToGHL(lead.ghlContactId, lead.assignedCompany, status).catch(err =>
        server.log.error('[ghl-sync] ' + err.message)
      )
    }

    return updated
  })
}
