/**
 * Geocoding service using Nominatim (OpenStreetMap) — free, no API key required.
 * Rate limited to 1 req/sec per OSM usage policy.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'BCFPortal/1.0 (nicola@bcfgroup.co.uk)'

interface Coords { lat: number; lng: number }

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Geocode a free-text address. Returns null if not found. */
export async function geocode(address: string): Promise<Coords | null> {
  if (!address?.trim()) return null

  // Clean up eplanning.ie addresses (remove county/country noise)
  const query = address
    .replace(/\bCo\.\s*/gi, '')
    .replace(/\bIreland\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const params = new URLSearchParams({
    q:              query,
    format:         'json',
    limit:          '1',
    countrycodes:   'gb,ie',
    addressdetails: '0',
  })

  try {
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) return null

    const data = await res.json() as { lat: string; lon: string }[]
    if (!data.length) return null

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    }
  } catch {
    return null
  }
}

/**
 * Geocode a UK/NI postcode directly — more accurate than free-text for postcodes.
 * Uses postcodes.io (free, no key required).
 */
export async function geocodePostcode(postcode: string): Promise<Coords | null> {
  if (!postcode?.trim()) return null

  // For NI postcodes (BT...) use postcodes.io
  if (/^BT/i.test(postcode)) {
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`,
        { headers: { 'User-Agent': USER_AGENT } }
      )
      if (!res.ok) return null
      const data = await res.json() as { result?: { latitude: number; longitude: number } }
      if (data.result?.latitude) {
        return { lat: data.result.latitude, lng: data.result.longitude }
      }
    } catch { /* fall through */ }
  }

  return null
}

/**
 * Best-effort geocode: try postcode first (most accurate), fall back to address.
 * Respects Nominatim 1 req/sec rate limit.
 */
export async function geocodeLead(
  postcode: string | null | undefined,
  address: string | null | undefined,
  region: string | null | undefined
): Promise<Coords | null> {
  // NI postcode is most accurate
  if (postcode && /^BT/i.test(postcode)) {
    const coords = await geocodePostcode(postcode)
    if (coords) return coords
  }

  // Fall back to address geocoding (rate limit: 1/sec)
  if (address) {
    await sleep(1100)
    // Add region hint for better results
    const query = region === 'NI'
      ? `${address}, Northern Ireland`
      : `${address}, Ireland`
    return geocode(query)
  }

  return null
}
