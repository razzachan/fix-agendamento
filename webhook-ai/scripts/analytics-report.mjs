import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function fromSupabase(params) {
  const usp = new URLSearchParams(params)
  const url = `${SUPABASE_URL}/rest/v1/bot_analytics_events?${usp.toString()}`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Supabase REST error: ${res.status}`)
  }
  return res.json()
}

async function generateRealReport() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  // Sessions = únicos session_id com msg:in na última semana
  const sessionsRows = await fromSupabase({ select: 'session_id,ts', ts: `gte.${since}`, type: 'eq.msg:in' })
  const sessions = new Set(sessionsRows.map(r => r.session_id).filter(Boolean)).size

  const buildQuoteRows = await fromSupabase({ select: 'ts', ts: `gte.${since}`, type: 'eq.tool:buildQuote' })
  const schedulesStartedRows = await fromSupabase({ select: 'ts', ts: `gte.${since}`, type: 'eq.aiScheduleStart' })
  const schedulesConfirmedRows = await fromSupabase({ select: 'ts', ts: `gte.${since}`, type: 'eq.aiScheduleConfirm' })

  return {
    period: 'last_week',
    totals: {
      sessions,
      successful_quotes: buildQuoteRows.length || 0,
      schedules_started: schedulesStartedRows.length || 0,
      schedules_confirmed: schedulesConfirmedRows.length || 0,
    },
    insights: [
      'Relatório gerado a partir de eventos reais no Supabase (últimos 7 dias).',
    ],
  }
}

async function generateFallbackReport() {
  return {
    period: 'last_week',
    totals: {
      sessions: 42,
      successful_quotes: 31,
      schedules_started: 19,
      schedules_confirmed: 11,
    },
    insights: [
      'Supabase não configurado; usando dados sintéticos.',
    ],
  }
}

const outDir = path.join(__dirname, '../../.reports')
fs.mkdirSync(outDir, { recursive: true })

;(async () => {
  let report
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      report = await generateRealReport()
    } catch (e) {
      console.warn('[analytics-report] fallback to synthetic due to error:', e?.message || e)
      report = await generateFallbackReport()
    }
  } else {
    report = await generateFallbackReport()
  }
  fs.writeFileSync(path.join(outDir, 'weekly-report.json'), JSON.stringify(report, null, 2))
  console.log('Report written to .reports/weekly-report.json')
})()

