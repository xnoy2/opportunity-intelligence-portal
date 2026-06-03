/** GoHighLevel CRM integration — push leads as contacts + pipeline sync via tags */

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1'

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

interface GHLPushParams {
  leadId:      string
  planningRef: string
  company:     string
  score:       number
  location:    string
  summary:     string
}

async function ghlRequest(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown
): Promise<unknown> {
  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GHL ${method} ${path} failed (${res.status}): ${text}`)
  }

  return res.json()
}

/** Create or update a GHL contact for a lead. Returns the GHL contact ID. */
export async function pushToGHL(params: GHLPushParams): Promise<string | null> {
  const apiKey = API_KEYS[params.company]
  if (!apiKey) {
    console.warn(`[ghl] No API key for company ${params.company} — skipping push`)
    return null
  }

  const locationId = LOCATION_IDS[params.company]
  if (!locationId) {
    console.warn(`[ghl] No location ID for company ${params.company} — skipping push`)
    return null
  }

  const scoreBand = params.score >= 85 ? 'high' : params.score >= 70 ? 'medium' : 'standard'
  const placeholderEmail = `${params.planningRef.replace(/\//g, '-').toLowerCase()}@planning-lead.bcfportal`

  const contactPayload = {
    locationId,
    firstName:  'Planning Lead',
    lastName:   params.planningRef,
    name:       `Planning Lead — ${params.planningRef}`,
    email:      placeholderEmail,
    customField: {
      planning_ref:      params.planningRef,
      lead_score:        String(params.score),
      location:          params.location,
      ai_summary:        params.summary,
      assigned_company:  params.company,
      portal_id:         params.leadId,
    },
    tags: [
      'planning-lead',
      `score-${scoreBand}`,
      params.company.toLowerCase(),
      'new-lead',
    ],
  }

  try {
    const data = await ghlRequest('POST', '/contacts/', apiKey, contactPayload) as {
      contact?: { id: string }
    }
    const contactId = data.contact?.id ?? null
    if (contactId) {
      console.log(`[ghl] Contact created: ${contactId} for ${params.planningRef}`)
    }
    return contactId
  } catch (err) {
    console.error('[ghl] Push failed:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Sync a pipeline stage change to GHL by updating the contact's tags. */
export async function syncStatusToGHL(
  ghlContactId: string,
  company:      string,
  newStatus:    string
): Promise<void> {
  const apiKey = API_KEYS[company]
  if (!apiKey || !ghlContactId) return

  // Map portal pipeline stages to GHL tags
  const stageTags: Record<string, string[]> = {
    REVIEWED:    ['reviewed'],
    CONTACTED:   ['contacted', 'follow-up-3day'],
    QUOTE_SENT:  ['quote-sent', 'follow-up-5day'],
    FOLLOW_UP:   ['follow-up-active'],
    NEGOTIATION: ['negotiation', 'hot-lead'],
    WON:         ['won-client', 'closed-won'],
    LOST:        ['lost-prospect'],
  }

  const tags = stageTags[newStatus]
  if (!tags) return

  try {
    await ghlRequest('POST', `/contacts/${ghlContactId}/tags`, apiKey, { tags })
    console.log(`[ghl] Tags added to ${ghlContactId}: ${tags.join(', ')}`)
  } catch (err) {
    console.error('[ghl] Tag update failed:', err instanceof Error ? err.message : err)
  }
}
