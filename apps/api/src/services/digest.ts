/**
 * Weekly digest email — top 10 leads sent every Monday 8am to Nicola.
 * Uses Resend (https://resend.com) for email delivery.
 * Set RESEND_API_KEY + DIGEST_EMAIL_TO in Railway env vars.
 */

import { Resend } from 'resend'
import { prisma } from '@bcf/db'

const COMPANY_COLOURS: Record<string, string> = {
  BGR:      '#4A9EFF',
  BWDS:     '#C084FC',
  BCF:      '#3ECF8E',
  MULTIPLE: '#C9A84C',
}

function fmtValue(n: number) {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `£${Math.round(n / 1000)}k`
  return `£${n}`
}

function scoreBadge(score: number) {
  const bg = score >= 85 ? '#C9A84C' : score >= 70 ? '#E2A24B' : '#4A5568'
  return `<span style="background:${bg};color:#0F1623;font-weight:700;padding:2px 8px;border-radius:4px;font-size:13px;">${score}</span>`
}

function generateHtml(leads: Awaited<ReturnType<typeof getTopLeads>>, stats: { total: number; pipeline: number; newThisWeek: number }) {
  const rows = leads.map((l: (typeof leads)[number]) => `
    <tr style="border-bottom:1px solid #1E2D42;">
      <td style="padding:12px 16px;white-space:nowrap;">${scoreBadge(l.leadScore)}</td>
      <td style="padding:12px 16px;">
        <div style="font-weight:600;color:#fff;font-size:14px;">${l.location ?? l.planningRef}</div>
        <div style="color:#8B9AAD;font-size:12px;margin-top:2px;">${l.planningRef} · ${l.sourceRegion}</div>
      </td>
      <td style="padding:12px 16px;">
        <span style="background:${COMPANY_COLOURS[l.assignedCompany ?? ''] ?? '#4A5568'}22;color:${COMPANY_COLOURS[l.assignedCompany ?? ''] ?? '#8B9AAD'};border:1px solid ${COMPANY_COLOURS[l.assignedCompany ?? ''] ?? '#4A5568'}44;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">${l.assignedCompany ?? '—'}</span>
      </td>
      <td style="padding:12px 16px;color:#C9A84C;font-weight:600;white-space:nowrap;">${l.estimatedValue ? fmtValue(l.estimatedValue) : '—'}</td>
      <td style="padding:12px 16px;color:#8B9AAD;font-size:12px;max-width:300px;">${l.aiSummary?.slice(0, 120) ?? '—'}${(l.aiSummary?.length ?? 0) > 120 ? '…' : ''}</td>
    </tr>
  `).join('')

  const portalUrl = process.env.WEB_URL ?? 'https://web-production-90ce7.up.railway.app'

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1623;font-family:Arial,Helvetica,sans-serif;color:#fff;">
  <div style="max-width:900px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="border-bottom:1px solid #1E2D42;padding-bottom:20px;margin-bottom:24px;">
      <div style="color:#C9A84C;font-weight:700;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">BCF GROUP · PLANNING INTELLIGENCE</div>
      <h1 style="margin:0;font-size:26px;font-weight:700;color:#fff;">Weekly Lead Intelligence Report</h1>
      <div style="color:#8B9AAD;font-size:13px;margin-top:4px;">Week ending ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>

    <!-- KPIs -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px;">
      <div style="background:#131E2E;border:1px solid #1E2D42;border-radius:8px;padding:16px;">
        <div style="color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;">New This Week</div>
        <div style="font-size:28px;font-weight:700;color:#C9A84C;margin-top:4px;">${stats.newThisWeek}</div>
      </div>
      <div style="background:#131E2E;border:1px solid #1E2D42;border-radius:8px;padding:16px;">
        <div style="color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Total Active Leads</div>
        <div style="font-size:28px;font-weight:700;color:#fff;margin-top:4px;">${stats.total}</div>
      </div>
      <div style="background:#131E2E;border:1px solid #1E2D42;border-radius:8px;padding:16px;">
        <div style="color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Est. Pipeline Value</div>
        <div style="font-size:28px;font-weight:700;color:#3ECF8E;margin-top:4px;">${fmtValue(stats.pipeline)}</div>
      </div>
    </div>

    <!-- Top 10 table -->
    <div style="background:#131E2E;border:1px solid #1E2D42;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <div style="padding:16px 20px;border-bottom:1px solid #1E2D42;display:flex;justify-content:space-between;align-items:center;">
        <h2 style="margin:0;font-size:16px;font-weight:600;">Top 10 Opportunities This Week</h2>
        <span style="color:#8B9AAD;font-size:12px;">Ranked by AI score</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #1E2D42;">
            <th style="padding:10px 16px;text-align:left;color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Score</th>
            <th style="padding:10px 16px;text-align:left;color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Lead</th>
            <th style="padding:10px 16px;text-align:left;color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Co.</th>
            <th style="padding:10px 16px;text-align:left;color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Value</th>
            <th style="padding:10px 16px;text-align:left;color:#8B9AAD;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">AI Summary</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${portalUrl}/dashboard" style="background:#C9A84C;color:#0F1623;font-weight:700;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;display:inline-block;">
        Open BCF Portal →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #1E2D42;padding-top:16px;color:#4A5568;font-size:11px;text-align:center;">
      BCF Group · Opportunity Intelligence Portal · Automated weekly digest<br>
      BGR · BWDS NI · Ballycastle Climbing Frames
    </div>
  </div>
</body>
</html>`
}

async function getTopLeads() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return prisma.lead.findMany({
    where: { leadScore: { gt: 0 }, createdAt: { gte: since7d } },
    orderBy: { leadScore: 'desc' },
    take: 10,
    select: {
      planningRef: true, location: true, assignedCompany: true,
      leadScore: true, estimatedValue: true, aiSummary: true,
      sourceRegion: true,
    },
  })
}

export async function sendWeeklyDigest(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to     = process.env.DIGEST_EMAIL_TO ?? 'nicola@bcfgroup.co.uk'

  if (!apiKey) {
    console.warn('[digest] RESEND_API_KEY not set — skipping email send')
    return
  }

  const [leads, pipeline, total, newThisWeek] = await Promise.all([
    getTopLeads(),
    prisma.lead.aggregate({
      where: { status: { notIn: ['WON', 'LOST'] }, leadScore: { gt: 0 } },
      _sum: { estimatedValue: true },
    }),
    prisma.lead.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
    prisma.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ])

  const stats = {
    total,
    newThisWeek,
    pipeline: pipeline._sum.estimatedValue ?? 0,
  }

  const html = generateHtml(leads, stats)

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from:    'BCF Portal <digest@bcfportal.co.uk>',
    to,
    subject: `BCF Weekly Intelligence Report — ${leads.length} new leads, ${fmtValue(stats.pipeline)} pipeline`,
    html,
  })

  if (error) {
    console.error('[digest] Email send failed:', error)
  } else {
    console.log(`[digest] Weekly digest sent to ${to}`)
  }
}

/** Generate digest HTML without sending — for preview/testing */
export async function getDigestPreview() {
  const leads = await getTopLeads()
  const [pipeline, total, newThisWeek] = await Promise.all([
    prisma.lead.aggregate({
      where: { status: { notIn: ['WON', 'LOST'] }, leadScore: { gt: 0 } },
      _sum: { estimatedValue: true },
    }),
    prisma.lead.count({ where: { status: { notIn: ['WON', 'LOST'] } } }),
    prisma.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
  ])
  return {
    leadsCount: leads.length,
    html: generateHtml(leads, {
      total,
      newThisWeek,
      pipeline: pipeline._sum.estimatedValue ?? 0,
    }),
  }
}
