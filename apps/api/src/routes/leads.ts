import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, getCompanyFilter } from '../middleware/auth.js'
import { syncStatusToGHL } from '../services/ghl.js'
import type { Company, LeadStatus } from '@bcf/db'

const LEAD_STATUSES = ['NEW', 'REVIEWED', 'CONTACTED', 'QUOTE_SENT', 'FOLLOW_UP', 'NEGOTIATION', 'WON', 'LOST'] as const
const statusSchema = z.object({ status: z.enum(LEAD_STATUSES) })

const querySchema = z.object({
  status:     z.string().optional(),
  company:    z.string().optional(),
  minScore:   z.coerce.number().optional(),
  maxScore:   z.coerce.number().optional(),
  region:     z.string().optional(),
  since:      z.string().datetime().optional(),
  category:   z.enum(['approved', 'high_value', 'tourism', 'commercial']).optional(),
  classified: z.enum(['true', 'false']).optional(),
  unactioned: z.coerce.boolean().optional(),
  orderBy:    z.enum(['score', 'recent']).default('score'),
  limit:      z.coerce.number().default(50),
  offset:     z.coerce.number().default(0),
})

// Canonical threshold for a "high value" / "hot" lead — used by the list,
// the high_value category and the dashboard KPI so they always agree.
const HIGH_VALUE_SCORE = 85

const icontains = (s: string) => ({ contains: s, mode: 'insensitive' as const })

// Shared keyword sets so the Leads tabs and the dashboard KPIs match exactly.
const TOURISM_OR = [
  { projectType: icontains('tourism') },
  { projectType: icontains('glamping') },
  { projectType: icontains('holiday') },
  { projectType: icontains('short term let') },
  { projectType: icontains('accommodation') },
  { projectType: icontains('pod') },
  { projectType: icontains('lodge') },
  { projectType: icontains('bothy') },
]
const COMMERCIAL_OR = [
  { projectType: icontains('commercial') },
  { projectType: icontains('office') },
  { projectType: icontains('retail') },
  { projectType: icontains('industrial') },
  { projectType: icontains('mixed use') },
]

// Note: 'high_value' is handled via the merged leadScore filter (not here) so
// it composes with an explicit score range instead of overwriting it.
function categoryWhere(category: string | undefined) {
  switch (category) {
    case 'approved':   return { dateApproved: { not: null } }
    case 'tourism':    return { OR: TOURISM_OR }
    case 'commercial': return { OR: COMMERCIAL_OR }
    default:           return {}
  }
}

export const leadsRoutes: FastifyPluginAsync = async server => {
  server.addHook('preHandler', requireAuth)

  // GET /leads — filterable list
  server.get('/', async request => {
    const q = querySchema.parse(request.query)
    const companyFilter = getCompanyFilter(request)

    // Merge score range + high_value category into ONE leadScore filter so they
    // compose (rather than one silently overwriting the other).
    const leadScore: { gte?: number; lte?: number } = {}
    if (q.minScore !== undefined) leadScore.gte = q.minScore
    if (q.maxScore !== undefined) leadScore.lte = q.maxScore
    if (q.category === 'high_value') leadScore.gte = Math.max(leadScore.gte ?? 0, HIGH_VALUE_SCORE)

    // Status: an explicit status wins; otherwise "unactioned" limits to NEW/REVIEWED.
    const statusWhere = q.status
      ? (q.status as LeadStatus)
      : q.unactioned
        ? { in: ['NEW', 'REVIEWED'] as LeadStatus[] }
        : undefined

    const where = {
      ...(companyFilter && { assignedCompany: companyFilter }),
      ...(q.company && !companyFilter && { assignedCompany: q.company as Company }),
      ...(statusWhere !== undefined && { status: statusWhere }),
      ...(Object.keys(leadScore).length > 0 && { leadScore }),
      ...(q.region && { sourceRegion: q.region }),
      ...(q.since && { createdAt: { gte: new Date(q.since) } }),
      ...categoryWhere(q.category),
      ...(q.classified === 'false' && { classifiedAt: null }),
      ...(q.classified === 'true' && { classifiedAt: { not: null } }),
    }

    const [leads, total] = await Promise.all([
      server.prisma.lead.findMany({
        where,
        orderBy: q.orderBy === 'recent' ? { updatedAt: 'desc' } : { leadScore: 'desc' },
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
          classifiedAt: true,
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
      server.prisma.lead.count({ where: { ...companyWhere, leadScore: { gte: HIGH_VALUE_SCORE } } }),
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
        where: { ...companyWhere, OR: TOURISM_OR },
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
    const parsed = statusSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: `Invalid status. Use one of: ${LEAD_STATUSES.join(', ')}` })
    }
    const { status } = parsed.data
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

    // Portal → GHL: move the opportunity to the matching stage (+ tag contact)
    if (lead.assignedCompany && (lead.ghlOpportunityId || lead.ghlContactId)) {
      const title = `${lead.planningRef} — ${lead.location || 'Planning Lead'}`
      syncStatusToGHL(lead.assignedCompany, status, lead.ghlOpportunityId, lead.ghlContactId, title).catch(err =>
        server.log.error('[ghl-sync] ' + err.message)
      )
    }

    return updated
  })
}
