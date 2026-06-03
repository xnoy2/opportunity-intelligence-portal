import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth, getCompanyFilter } from '../middleware/auth.js'
import { triggerScraper } from '../jobs/scheduler.js'
import { makeQueue } from '../jobs/queue.js'
import { sendWeeklyDigest, getDigestPreview } from '../services/digest.js'

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

  // ─── Manual AI classification controls (admin only) ───────────────────────
  const classifySchema = z.object({ leadIds: z.array(z.string()).min(1).max(2000) })

  // POST /pipeline/classify — classify a chosen set of leads
  server.post('/classify', async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
    const body = classifySchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Provide leadIds[] (1–2000)' })

    const q = makeQueue('classifier')
    await q.resume() // ensure the worker will process the jobs we add
    await q.addBulk(body.data.leadIds.map(id => ({ name: 'classify', data: { leadId: id } })))
    console.log(`[pipeline] Manually queued ${body.data.leadIds.length} leads for classification`)
    return { queued: body.data.leadIds.length }
  })

  // GET /pipeline/classify/status — live job state for the monitor
  server.get('/classify/status', async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
    const q = makeQueue('classifier')
    const counts = await q.getJobCounts('active', 'waiting', 'delayed', 'completed', 'failed')
    const paused = await q.isPaused()
    const unclassified = await server.prisma.lead.count({ where: { classifiedAt: null } })
    return {
      active:    counts.active ?? 0,
      waiting:   (counts.waiting ?? 0) + (counts.delayed ?? 0),
      completed: counts.completed ?? 0,
      failed:    counts.failed ?? 0,
      paused,
      unclassified,
    }
  })

  // POST /pipeline/classify/stop — halt classification (pause + clear pending jobs)
  server.post('/classify/stop', async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
    const q = makeQueue('classifier')
    await q.pause()
    await q.drain(true)
    console.log('[pipeline] Classification STOPPED (queue paused + drained)')
    return { stopped: true }
  })

  // POST /pipeline/classify/resume — allow classification again
  server.post('/classify/resume', async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
    await makeQueue('classifier').resume()
    return { resumed: true }
  })

  // GET /pipeline/digest/preview — preview digest HTML (admin only)
  server.get('/digest/preview', async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
    const preview = await getDigestPreview()
    return reply.type('text/html').send(preview.html)
  })

  // POST /pipeline/digest/send — manually send the weekly digest (admin only)
  server.post('/digest/send', async (request, reply) => {
    if (request.user.role !== 'ADMIN') return reply.status(403).send({ error: 'Admin only' })
    await sendWeeklyDigest()
    return { sent: true }
  })

  // POST /pipeline/scrape — manually trigger a scraper run (admin only)
  server.post('/scrape', async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Admin only' })
    }
    const { source = 'ni' } = (request.body ?? {}) as { source?: string }
    const VALID = ['ni', 'roi', 'pleanala', 'england', 'daera']
    if (!VALID.includes(source)) {
      return reply.status(400).send({ error: `Invalid source. Use: ${VALID.join(', ')}` })
    }
    await triggerScraper(source as Parameters<typeof triggerScraper>[0])
    return { queued: true, source }
  })
}
