import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '../../.env') })

import { Worker } from 'bullmq'
import { getConnection, makeQueue } from './queue.js'
import { scrapeNI } from './scrapers/ni.js'
import { classifyLead } from '../services/classifier.js'
import { prisma } from '@bcf/db'
import { pushToGHL } from '../services/ghl.js'

// ─── Scraper worker ───────────────────────────────────────────────────────────

new Worker('scrapers', async job => {
  const start = Date.now()
  const source: string = job.data.source

  console.log(`[worker] Starting scraper: ${job.name} (source: ${source})`)

  try {
    let result = { found: 0, inserted: 0 }

    if (source === 'ni') result = await scrapeNI()
    else console.log(`[worker] ${source} scraper not yet implemented`)

    await prisma.scrapeLog.create({
      data: { source, leadsFound: result.found, leadsNew: result.inserted, status: 'success', durationMs: Date.now() - start },
    })

    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await prisma.scrapeLog.create({
      data: { source, leadsFound: 0, leadsNew: 0, status: 'error', error, durationMs: Date.now() - start },
    })
    throw err
  }
}, { connection: getConnection(), concurrency: 1 })

// ─── Classifier worker ────────────────────────────────────────────────────────

new Worker('classifier', async job => {
  const { leadId } = job.data as { leadId: string }

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead?.description) return

  console.log(`[worker] Classifying ${lead.planningRef}`)

  const result = await classifyLead(lead.description, lead.location ?? undefined)

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      projectType: result.project_type,
      assignedCompany: result.assigned_company,
      leadScore: result.lead_score,
      estimatedValue: result.estimated_value_gbp,
      aiSummary: result.ai_summary,
      suggestedAction: result.suggested_action,
      classifiedAt: new Date(),
    },
  })

  if (result.lead_score >= 70) {
    await pushToGHL({
      leadId,
      planningRef: lead.planningRef,
      company: result.assigned_company,
      score: result.lead_score,
      location: lead.location ?? '',
      summary: result.ai_summary,
    })
  }
}, { connection: getConnection(), concurrency: 3 })

console.log('[worker] Scraper + classifier workers running. Ctrl+C to stop.')
