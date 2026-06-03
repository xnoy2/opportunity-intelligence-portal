import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface ClassificationResult {
  project_type: string
  assigned_company: 'BGR' | 'BWDS' | 'BCF' | 'MULTIPLE'
  lead_score: number
  estimated_value_gbp: number
  ai_summary: string
  suggested_action: string
}

const SYSTEM_PROMPT = `You are an AI classifier for BCF Group Northern Ireland, covering three companies:

BGR (Bespoke Garden Rooms Ballycastle): garden rooms, garden studios, home offices (standalone), holiday pods, glamping structures, farm diversification outdoor buildings, outdoor living spaces. Typical values £6k-£80k+.

BWDS NI (Windows & Doors NI): window replacement, door installation, conservatories, sunrooms, cladding, roofing renovation, commercial glazing. Typical values £3k-£40k.

BCF (Ballycastle Climbing Frames): outdoor play areas, climbing frames, playground equipment, school/nursery outdoor developments, holiday park play facilities. Typical values £2k-£8k.

Score leads 0–100 using these weights:
- Project type match to company services: 40%
- Geographic proximity (Ballycastle, Co. Antrim, NI is home base): 20%
- Project scale and value signals: 20%
- Timing (approved > submitted recently > older): 10%
- Cross-sell potential (multiple companies): 10%

Apply these score modifiers:
+10 if application mentions multiple structures
+8 if tourism or farm diversification
+5 if commercial rather than residential
+5 if application is approved
+5 if postcode is within ~30 miles of Ballycastle (BT54 area, north Antrim coast)

High-value categories: holiday pods/glamping (£15k-£80k+), farm diversification, tourism accommodation. Flag these as CRITICAL.

Use the record_classification tool to return your analysis.`

// Forced tool call guarantees a structured, schema-valid response.
const CLASSIFY_TOOL = {
  name: 'record_classification',
  description: 'Record the structured classification of a planning-application lead.',
  input_schema: {
    type: 'object' as const,
    properties: {
      project_type:        { type: 'string', description: 'Short project description, e.g. "Garden room", "Window replacement"' },
      assigned_company:    { type: 'string', enum: ['BGR', 'BWDS', 'BCF', 'MULTIPLE'], description: 'Best-fit company; MULTIPLE only when genuinely cross-company' },
      lead_score:          { type: 'integer', minimum: 0, maximum: 100, description: 'Lead score 0-100 using the weighting in the system prompt' },
      estimated_value_gbp: { type: 'integer', minimum: 0, description: 'Best-estimate project value in GBP, 0 if truly unknown' },
      ai_summary:          { type: 'string', description: '1-2 sentence summary of the opportunity for the sales team' },
      suggested_action:    { type: 'string', description: 'Concrete next step for the sales team' },
    },
    required: ['project_type', 'assigned_company', 'lead_score', 'estimated_value_gbp', 'ai_summary', 'suggested_action'],
  },
}

export async function classifyLead(
  description: string,
  location?: string
): Promise<ClassificationResult> {
  const content = [
    description,
    location ? `Location: ${location}` : null,
  ].filter(Boolean).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: 'tool', name: 'record_classification' },
    messages: [
      { role: 'user', content: `Analyse this planning application:\n\n${content}` },
    ],
  })

  const toolUse = message.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Classifier did not return a tool_use block')
  }
  const raw = toolUse.input as Record<string, unknown>

  console.log('[classifier] Raw response:', JSON.stringify(raw).slice(0, 200))

  // Normalise field names — Claude may use different casings
  const score = Number(
    raw.lead_score ?? raw.leadScore ?? raw.score ?? raw.Lead_Score ?? 50
  )

  const result: ClassificationResult = {
    project_type:       String(raw.project_type ?? raw.projectType ?? raw.type ?? 'Unknown'),
    assigned_company:   (raw.assigned_company ?? raw.assignedCompany ?? raw.company ?? 'MULTIPLE') as ClassificationResult['assigned_company'],
    lead_score:         isNaN(score) ? 50 : Math.max(0, Math.min(100, Math.round(score))),
    estimated_value_gbp: Number(raw.estimated_value_gbp ?? raw.estimatedValue ?? raw.value ?? 0),
    ai_summary:         String(raw.ai_summary ?? raw.aiSummary ?? raw.summary ?? raw.application_summary ?? ''),
    suggested_action:   String(raw.suggested_action ?? raw.suggestedAction ?? raw.action ?? raw.next_step ?? ''),
  }

  return result
}
