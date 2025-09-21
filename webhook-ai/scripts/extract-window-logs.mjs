import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env from project root if available
try {
  dotenv.config({ path: path.join(__dirname, '../../.env') })
  dotenv.config() // fallback to default lookup
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[extract-window-logs] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY envs')
  process.exit(1)
}

const outDir = path.join(__dirname, '../../.reports')
fs.mkdirSync(outDir, { recursive: true })

function toISOFromBRT(dateLike) {
  // dateLike: 'YYYY-MM-DD HH:MM' or Date
  // Brazil (America/Sao_Paulo) current offset: -03:00 (no DST)
  if (dateLike instanceof Date) return dateLike.toISOString()
  const s = String(dateLike).replace(' ', 'T') + '-03:00'
  const d = new Date(s)
  return d.toISOString()
}

function todayStrBRT() {
  const now = new Date()
  // Build in BRT by subtracting 3 hours
  const brtNow = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const y = brtNow.getFullYear()
  const m = String(brtNow.getMonth() + 1).padStart(2, '0')
  const d = String(brtNow.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const argv = process.argv.slice(2)
let startArg = argv[0]
let endArg = argv[1]
const baseDay = argv[2] || todayStrBRT() // YYYY-MM-DD in BRT

if (!startArg) startArg = `${baseDay} 07:00`
if (!endArg) endArg = `${baseDay} 11:00`

const startISO = toISOFromBRT(startArg)
const endISO = toISOFromBRT(endArg)

async function fromSupabase(table, params) {
  const usp = new URLSearchParams(params)
  const url = `${SUPABASE_URL}/rest/v1/${table}?${usp.toString()}`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Supabase REST error: ${res.status} for ${table}: ${txt}`)
  }
  return res.json()
}

function normalizePhone(p) {
  return (p || '').replace(/\D+/g, '')
}

async function run() {
  console.log(`[extract-window-logs] Window BRT ${startArg} .. ${endArg} (UTC ${startISO} .. ${endISO})`)

  // Fetch conversation messages in window
  const convMsgs = await fromSupabase('conversation_messages', {
    select: 'thread_id,direction,type,content,created_at',
    created_at: `gte.${startISO}`,
    created_at2: `lte.${endISO}`,
    order: 'created_at.asc',
  }).catch(async (e) => {
    // Some PostgREST instances need explicit and blocks; fall back to rpc or filter in-memory
    console.warn('[extract-window-logs] Fallback fetch (no composite filters):', e.message)
    const all = await fromSupabase('conversation_messages', { select: 'thread_id,direction,type,content,created_at', order: 'created_at.desc', limit: '2000' })
    return all.filter(r => r.created_at >= startISO && r.created_at <= endISO).sort((a,b)=>a.created_at.localeCompare(b.created_at))
  })

  const threadIds = Array.from(new Set(convMsgs.map(m => m.thread_id))).filter(Boolean)

  // Fetch threads to map contact/channel
  let threads = []
  if (threadIds.length) {
    const inList = threadIds.map(id => `eq.${id}`).join(',')
    // If too many, chunk
    const chunked = []
    for (let i=0;i<threadIds.length;i+=200) chunked.push(threadIds.slice(i,i+200))
    for (const chunk of chunked) {
      const ids = chunk.map(id => `eq.${id}`).join(',')
      const rows = await fromSupabase('conversation_threads', { select: 'id,contact,channel,started_at,closed_at', id: `in.(${ids})` })
      threads.push(...rows)
    }
  }
  const threadMap = new Map(threads.map(t => [t.id, t]))

  // Fetch analytics events in window
  const events = await fromSupabase('bot_analytics_events', {
    select: 'ts,type,session_id,from,channel,data',
    ts: `gte.${startISO}`,
    ts2: `lte.${endISO}`,
    order: 'ts.asc',
  }).catch(async () => [])

  // Fetch AI router logs (optional)
  const aiLogs = await fromSupabase('bot_ai_router_logs', {
    select: 'created_at,event,payload',
    created_at: `gte.${startISO}`,
    created_at2: `lte.${endISO}`,
    order: 'created_at.asc',
  }).catch(async () => [])

  // Group conversations by contact
  const convs = {}
  for (const m of convMsgs) {
    const th = threadMap.get(m.thread_id)
    const contact = th?.contact || 'unknown'
    if (!convs[contact]) convs[contact] = { contact, channel: th?.channel || 'whatsapp', thread_id: m.thread_id, timeline: [] }
    convs[contact].timeline.push({ at: m.created_at, dir: m.direction, type: m.type, text: m.content })
  }
  // Attach analytics per contact when possible (match by from/session where available)
  for (const ev of events) {
    const from = ev.from || null
    const contact = from ? normalizePhone(from) : null
    const key = Object.keys(convs).find(k => normalizePhone(k).endsWith(contact || '')) || null
    if (!key) continue
    if (!convs[key].events) convs[key].events = []
    convs[key].events.push({ at: ev.ts, type: ev.type, data: ev.data })
  }

  // Compute quick summary and gaps
  const summaries = []
  for (const [contact, c] of Object.entries(convs)) {
    c.timeline.sort((a,b)=>a.at.localeCompare(b.at))
    const lastBot = [...c.timeline].reverse().find(x => x.dir === 'outbound')
    const lastUserAfterBot = c.timeline.find(x => x.dir === 'inbound' && (!lastBot || x.at > lastBot.at))
    // Basic intent hints
    const texts = c.timeline.map(x => x.text.toLowerCase())
    const askedStatus = texts.some(t => /(status|andamento|atualiza[cç][aã]o|novidade|not[ií]cia|previs[aã]o|quando .*t[eé]cnico|chegou .*pe[çc]a)/.test(t))
    const offeredMenu = texts.some(t => /posso te ajudar com orçamento, agendamento ou status/.test(t))

    const gaps = []
    if (askedStatus && offeredMenu && !texts.some(t => /aqui est[aá] o status das suas/.test(t))) {
      gaps.push('Pedido de status não caiu no fluxo automático (gatilho curto demais)')
    }
    summaries.push({ contact, total_msgs: c.timeline.length, last_bot_at: lastBot?.at || null, last_user_after_bot: !!lastUserAfterBot, gaps })
  }

  const out = {
    window_brt: { start: startArg, end: endArg },
    window_utc: { start: startISO, end: endISO },
    totals: { conversations: Object.keys(convs).length, messages: convMsgs.length, events: events.length, ai_logs: aiLogs.length },
    conversations: convs,
    summaries,
  }

  const stamp = baseDay.replace(/-/g,'')
  const safe = (s)=> String(s).replace(/[:\s]/g,'').replace(/[^0-9A-Za-z_-]/g,'')
  const s1 = safe(startArg.split(' ')[1] || 'start')
  const s2 = safe(endArg.split(' ')[1] || 'end')
  const jsonPath = path.join(outDir, `whatsapp-logs-${stamp}-${s1}-${s2}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2))
  console.log('Wrote', jsonPath)
}

run().catch((e)=>{
  console.error('[extract-window-logs] Failed:', e)
  process.exit(1)
})

