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

OUTPUT FORMAT — respond with a single JSON object and nothing else. Use exactly these keys:
{
  "project_type": string,            // short description of the project, e.g. "Garden room", "Window replacement", "GAA sports facility"
  "assigned_company": string,        // one of: "BGR", "BWDS", "BCF", "MULTIPLE" (use MULTIPLE only when genuinely cross-company; pick the single best fit otherwise)
  "lead_score": number,              // integer 0-100 using the weighting above
  "estimated_value_gbp": number,     // integer best-estimate project value in GBP, 0 if truly unknown
  "ai_summary": string,              // 1-2 sentence summary of the opportunity for the sales team
  "suggested_action": string         // concrete next step, e.g. "Call applicant to discuss garden room options"
}
Do not include any other keys, commentary, or markdown.`

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
    messages: [
      {
        role: 'user',
        content: `Analyse this planning application and return the JSON object described above:\n\n${content}`,
      },
      // Prefill the assistant turn with an opening brace to force a JSON-only response.
      { role: 'assistant', content: '{' },
    ],
  })

  const body = message.content[0].type === 'text' ? message.content[0].text : ''
  // Re-attach the prefilled "{", then strip any stray markdown fences.
  const text = `{${body}`.trim()
  const clean = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(clean)
  } catch {
    throw new Error(`Classifier returned unparseable response: ${text.slice(0, 300)}`)
  }

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
