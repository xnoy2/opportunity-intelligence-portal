/**
 * GoHighLevel CRM integration.
 *
 * - Creates a Contact for each high-scoring lead.
 * - Creates an Opportunity in the "Planning Leads" pipeline and keeps its
 *   stage in sync with the portal's pipeline status (bidirectional — the
 *   reverse direction is handled by the /ghl/webhook route).
 *
 * The pipeline is resolved by NAME ("Planning Leads") so no IDs need hardcoding.
 * If that pipeline doesn't exist yet, opportunity sync is skipped gracefully
 * and only the contact is created.
 */

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1'
const PIPELINE_NAME = 'Planning Leads'

const LOCATION_IDS: Record<string, string | undefined> = {
  BGR:      process.env.GHL_BGR_LOCATION_ID,
  BCF:      process.env.GHL_BCF_LOCATION_ID,
  BWDS:     process.env.GHL_BGR_LOCATION_ID,
  MULTIPLE: process.env.GHL_BGR_LOCATION_ID,
}

const API_KEYS: Record<string, string | undefined> = {
  BGR:      process.env.GHL_BGR_API_KEY,
  BCF:      process.env.GHL_BCF_API_KEY,
  BWDS:     process.env.GHL_BGR_API_KEY,
  MULTIPLE: process.env.GHL_BGR_API_KEY,
}

// Portal status  →  GHL stage name (names must match the stages you create)
const STATUS_TO_STAGE: Record<string, string> = {
  NEW:         'New Lead',
  REVIEWED:    'Reviewed',
  CONTACTED:   'Contacted',
  QUOTE_SENT:  'Quote Sent',
  FOLLOW_UP:   'Follow Up',
  NEGOTIATION: 'Negotiation',
  WON:         'Won',
  LOST:        'Lost',
}

// GHL stage name (normalised) → portal status, for the inbound webhook
const STAGE_TO_STATUS: Record<string, string> = {
  'new lead':    'NEW',
  'reviewed':    'REVIEWED',
  'contacted':   'CONTACTED',
  'quote sent':  'QUOTE_SENT',
  'follow up':   'FOLLOW_UP',
  'negotiation': 'NEGOTIATION',
  'won':         'WON',
  'lost':        'LOST',
}

export function ghlStageNameToStatus(stageName: string): string | null {
  return STAGE_TO_STATUS[stageName.trim().toLowerCase()] ?? null
}

/** Reverse-resolve a GHL stageId to a portal status (for the inbound webhook). */
export async function ghlStageIdToStatus(company: string, stageId: string): Promise<string | null> {
  const apiKey = API_KEYS[company]
  if (!apiKey) return null
  const info = await getPlanningPipeline(company, apiKey)
  if (!info) return null
  // stageIds is name→id; invert to find the name for this id
  const entry = Object.entries(info.stageIds).find(([, id]) => id === stageId)
  return entry ? (STAGE_TO_STATUS[entry[0]] ?? null) : null
}

interface GHLPushParams {
  leadId:      string
  planningRef: string
  company:     string
  score:       number
  location:    string
  summary:     string
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * GHL request with automatic retry on transient failures (network errors,
 * 429 rate limits, 5xx). Without this, a single GHL/Railway hiccup silently
 * drops a stage sync and the portal/GHL drift apart.
 */
async function ghlRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown,
  attempt = 1,
): Promise<any> {
  const MAX_ATTEMPTS = 4
  try {
    const res = await fetch(`${GHL_API_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text()
      // Retry transient statuses; fail fast on 4xx (except 429)
      const transient = res.status === 429 || res.status >= 500
      if (transient && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 800)
        return ghlRequest(method, path, apiKey, body, attempt + 1)
      }
      throw new Error(`GHL ${method} ${path} failed (${res.status}): ${text}`)
    }
    return res.json()
  } catch (err) {
    // Network/timeout error → retry
    const isHttpError = err instanceof Error && err.message.startsWith('GHL ')
    if (!isHttpError && attempt < MAX_ATTEMPTS) {
      await sleep(attempt * 800)
      return ghlRequest(method, path, apiKey, body, attempt + 1)
    }
    throw err
  }
}

// ─── Pipeline resolution (cached per company for 10 min) ──────────────────────

interface PipelineInfo { pipelineId: string; stageIds: Record<string, string> }
const pipelineCache = new Map<string, { info: PipelineInfo | null; at: number }>()
const CACHE_MS = 10 * 60 * 1000

async function getPlanningPipeline(company: string, apiKey: string): Promise<PipelineInfo | null> {
  const cached = pipelineCache.get(company)
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.info

  let info: PipelineInfo | null = null
  try {
    const data = await ghlRequest('GET', '/pipelines/', apiKey) as {
      pipelines?: { id: string; name: string; stages: { id: string; name: string }[] }[]
    }
    const pipeline = data.pipelines?.find(
      p => p.name.trim().toLowerCase() === PIPELINE_NAME.toLowerCase()
    )
    if (pipeline) {
      const stageIds: Record<string, string> = {}
      for (const s of pipeline.stages) stageIds[s.name.trim().toLowerCase()] = s.id
      info = { pipelineId: pipeline.id, stageIds }
    } else {
      console.warn(`[ghl] "${PIPELINE_NAME}" pipeline not found for ${company} — opportunity sync skipped`)
    }
  } catch (err) {
    console.error('[ghl] pipeline lookup failed:', err instanceof Error ? err.message : err)
  }

  pipelineCache.set(company, { info, at: Date.now() })
  return info
}

function stageIdForStatus(info: PipelineInfo, status: string): string | undefined {
  const stageName = STATUS_TO_STAGE[status]
  return stageName ? info.stageIds[stageName.toLowerCase()] : undefined
}

// ─── Push: contact + opportunity ──────────────────────────────────────────────

export interface GHLPushResult { contactId: string | null; opportunityId: string | null }

export async function pushToGHL(params: GHLPushParams): Promise<GHLPushResult> {
  const apiKey = API_KEYS[params.company]
  const locationId = LOCATION_IDS[params.company]
  if (!apiKey || !locationId) {
    console.warn(`[ghl] No key/location for ${params.company} — skipping push`)
    return { contactId: null, opportunityId: null }
  }

  const scoreBand = params.score >= 85 ? 'high' : params.score >= 70 ? 'medium' : 'standard'
  const placeholderEmail = `${params.planningRef.replace(/\//g, '-').toLowerCase()}@planning-lead.bcfportal`

  let contactId: string | null = null
  try {
    const data = await ghlRequest('POST', '/contacts/', apiKey, {
      locationId,
      firstName: 'Planning Lead',
      lastName:  params.planningRef,
      name:      `Planning Lead — ${params.planningRef}`,
      email:     placeholderEmail,
      customField: {
        planning_ref:     params.planningRef,
        lead_score:       String(params.score),
        location:         params.location,
        ai_summary:       params.summary,
        assigned_company: params.company,
        portal_id:        params.leadId,
      },
      tags: ['planning-lead', `score-${scoreBand}`, params.company.toLowerCase()],
    }) as { contact?: { id: string } }
    contactId = data.contact?.id ?? null
    if (contactId) console.log(`[ghl] Contact ${contactId} for ${params.planningRef}`)
  } catch (err) {
    console.error('[ghl] Contact push failed:', err instanceof Error ? err.message : err)
  }

  // Create the opportunity in Planning Leads at "New Lead"
  let opportunityId: string | null = null
  const info = await getPlanningPipeline(params.company, apiKey)
  if (info) {
    const stageId = stageIdForStatus(info, 'NEW')
    if (stageId) {
      try {
        const opp = await ghlRequest('POST', `/pipelines/${info.pipelineId}/opportunities/`, apiKey, {
          title:    `${params.planningRef} — ${params.location || 'Planning Lead'}`,
          stageId,
          status:   'open',
          ...(contactId ? { contactId } : { email: placeholderEmail }),
          monetaryValue: 0,
        }) as { id?: string }
        opportunityId = opp.id ?? null
        if (opportunityId) console.log(`[ghl] Opportunity ${opportunityId} created at "New Lead"`)
      } catch (err) {
        console.error('[ghl] Opportunity create failed:', err instanceof Error ? err.message : err)
      }
    }
  }

  return { contactId, opportunityId }
}

// ─── Portal → GHL: move opportunity stage on status change ────────────────────

export async function syncStatusToGHL(
  company:         string,
  newStatus:       string,
  ghlOpportunityId: string | null,
  ghlContactId:    string | null,
  title:           string
): Promise<void> {
  const apiKey = API_KEYS[company]
  if (!apiKey) return

  // Best effort: move the opportunity to the matching stage
  if (ghlOpportunityId) {
    const info = await getPlanningPipeline(company, apiKey)
    const stageId = info ? stageIdForStatus(info, newStatus) : undefined
    if (info && stageId) {
      try {
        // GHL v1 PUT requires the `title` field — without it the move is rejected.
        await ghlRequest('PUT', `/pipelines/${info.pipelineId}/opportunities/${ghlOpportunityId}`, apiKey, {
          title,
          stageId,
          ...(newStatus === 'WON' ? { status: 'won' } : newStatus === 'LOST' ? { status: 'lost' } : { status: 'open' }),
        })
        console.log(`[ghl] Opportunity ${ghlOpportunityId} → ${STATUS_TO_STAGE[newStatus]}`)
      } catch (err) {
        console.error('[ghl] Stage move failed:', err instanceof Error ? err.message : err)
      }
    }
  }

  // Also tag the contact (harmless, useful for automations)
  if (ghlContactId) {
    const tag = STATUS_TO_STAGE[newStatus]?.toLowerCase().replace(/\s+/g, '-')
    if (tag) {
      try {
        await ghlRequest('POST', `/contacts/${ghlContactId}/tags`, apiKey, { tags: [tag] })
      } catch { /* non-critical */ }
    }
  }
}
