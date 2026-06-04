import type { FastifyPluginAsync } from 'fastify'
import { ghlStageNameToStatus, ghlStageIdToStatus } from '../services/ghl.js'

/**
 * Inbound webhook from GoHighLevel — keeps the portal in sync when an
 * opportunity is moved in GHL (the reverse of the portal → GHL stage sync).
 *
 * Configure a GHL Workflow:
 *   Trigger: Opportunity Status Changed (Pipeline = "Planning Leads")
 *   Action:  Webhook → POST {API_URL}/ghl/webhook
 *
 * Optional shared secret: set GHL_WEBHOOK_SECRET and append ?secret=... to the URL.
 *
 * GHL payload shapes vary, so we defensively pull the opportunity id and the
 * new stage (by id or name) from several possible keys.
 */
export const ghlRoutes: FastifyPluginAsync = async server => {
  server.post('/webhook', async (request, reply) => {
    const secret = process.env.GHL_WEBHOOK_SECRET
    if (secret) {
      const provided = (request.query as Record<string, string>)?.secret
        ?? request.headers['x-webhook-secret']
      if (provided !== secret) return reply.status(401).send({ error: 'bad secret' })
    }

    const body = (request.body ?? {}) as Record<string, any>
    // TEMP: log the full payload so we can see GHL's exact field names
    server.log.info('[ghl-webhook] RAW: ' + JSON.stringify(body))
    const opp = body.opportunity ?? body

    const opportunityId: string | undefined =
      opp.id ?? body.opportunity_id ?? body.opportunityId ?? opp.opportunityId
      ?? body.opportunity_id ?? body['opportunity.id']

    const stageName: string | undefined =
      opp.pipeline_stage ?? opp.pipelineStage ?? opp.stage ?? opp.stageName
      ?? body.pipeline_stage ?? body['opportunity.pipeline_stage'] ?? body.pipelineStageName
    const stageId: string | undefined =
      opp.pipelineStageId ?? opp.stageId ?? body.pipelineStageId ?? body.stageId
      ?? body['opportunity.pipeline_stage_id'] ?? body.pipeline_stage_id

    if (!opportunityId) {
      server.log.warn('[ghl-webhook] no opportunity id in payload')
      return { ok: false, reason: 'no opportunity id' }
    }

    const lead = await server.prisma.lead.findFirst({
      where: { ghlOpportunityId: opportunityId },
      select: { id: true, status: true, assignedCompany: true },
    })
    if (!lead) {
      server.log.warn(`[ghl-webhook] no lead for opportunity ${opportunityId}`)
      return { ok: false, reason: 'lead not found' }
    }

    // Resolve the new portal status from stage name or stage id
    let newStatus: string | null = null
    if (stageName) newStatus = ghlStageNameToStatus(stageName)
    if (!newStatus && stageId && lead.assignedCompany) {
      newStatus = await ghlStageIdToStatus(lead.assignedCompany, stageId)
    }

    if (!newStatus) {
      server.log.warn(`[ghl-webhook] could not resolve stage (name=${stageName}, id=${stageId})`)
      return { ok: false, reason: 'unknown stage' }
    }

    // Loop guard: only write if it actually changed. Update Prisma directly
    // (not via the PATCH route) so this does NOT push back to GHL.
    if (lead.status !== newStatus) {
      await server.prisma.lead.update({
        where: { id: lead.id },
        data:  { status: newStatus as never },
      })
      server.log.info(`[ghl-webhook] lead ${lead.id} → ${newStatus} (from GHL)`)
    }

    return { ok: true, status: newStatus }
  })
}
