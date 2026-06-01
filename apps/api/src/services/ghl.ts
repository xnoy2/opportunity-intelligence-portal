/** GoHighLevel CRM integration — push high-scoring leads as contacts */

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1'

const LOCATION_IDS: Record<string, string | undefined> = {
  BGR: process.env.GHL_BGR_LOCATION_ID,
  BCF: process.env.GHL_BCF_LOCATION_ID,
  // BWDS shares BGR location or add a separate ID if available
  BWDS: process.env.GHL_BGR_LOCATION_ID,
}

interface GHLPushParams {
  leadId: string
  planningRef: string
  company: string
  score: number
  location: string
  summary: string
}

export async function pushToGHL(params: GHLPushParams): Promise<void> {
  const apiKey = process.env.GHL_API_KEY
  if (!apiKey) {
    console.warn('[ghl] GHL_API_KEY not set — skipping push')
    return
  }

  const locationId = LOCATION_IDS[params.company]
  if (!locationId) {
    console.warn(`[ghl] No location ID for company ${params.company} — skipping push`)
    return
  }

  const contactPayload = {
    locationId,
    firstName: `Planning Lead`,
    lastName: params.planningRef,
    name: `Planning Lead — ${params.planningRef}`,
    customField: {
      planning_ref: params.planningRef,
      lead_score: String(params.score),
      location: params.location,
      ai_summary: params.summary,
      assigned_company: params.company,
      portal_id: params.leadId,
    },
    tags: [
      `planning-lead`,
      `score-${params.score >= 85 ? 'high' : params.score >= 70 ? 'medium' : 'standard'}`,
      params.company.toLowerCase(),
    ],
  }

  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[ghl] Push failed (${res.status}): ${body}`)
      return
    }

    const data = await res.json() as { contact?: { id: string } }
    console.log(`[ghl] Contact created: ${data.contact?.id} for lead ${params.planningRef}`)
  } catch (err) {
    console.error('[ghl] Network error:', err)
  }
}
