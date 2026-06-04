/**
 * Cheap, rules-based pre-filter that runs BEFORE the AI classifier.
 *
 * Administrative planning applications (condition discharges, amendments,
 * signage, monitoring/remediation reports, etc.) have no project to value and
 * are never real leads — so we skip the Anthropic call entirely to save spend.
 */

const ADMIN_PATTERNS: RegExp[] = [
  /discharge of (planning )?conditions?/i,
  /approval of conditions?/i,
  /condition compliance/i,
  /non[-\s]?material (amendment|change)/i,
  /certificate of lawful/i,
  /lawful development/i,
  /reserved matters/i,
  /advertisement consent/i,
  /\bsignage\b/i,
  /\badvert(isement)?\b/i,
  /remediation/i,
  /validation report/i,
  /\bmonitoring\b/i,           // bird / noise / environmental monitoring programmes
  /archaeolog/i,               // archaeological evaluation / watching brief
  /tree preservation/i,
  /\bTPO\b/,
]

/** True when the application text looks purely administrative (skip classification). */
export function isAdministrative(text?: string | null): boolean {
  if (!text) return false
  return ADMIN_PATTERNS.some(re => re.test(text))
}
