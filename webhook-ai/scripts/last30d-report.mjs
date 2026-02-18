import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function sha1(text) {
  return crypto.createHash('sha1').update(String(text)).digest('hex');
}

function anonPeer(peerId) {
  if (!peerId) return 'unknown';
  const digits = String(peerId).replace(/\D+/g, '');
  const suffix = digits.slice(-4);
  return `peer_${sha1(digits).slice(0, 10)}_${suffix}`;
}

function clip(text, n = 180) {
  const s = (text ?? '') === null ? '' : String(text ?? '');
  const oneLine = s.replace(/\s+/g, ' ').trim();
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine;
}

function classifyIntentFromInbound(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return 'unknown';
  if (/(humano|atendente|pessoa|falar com algu[eé]m|transferir)/.test(t)) return 'handoff';
  if (/(or[cç]amento|valor|pre[cç]o|quanto custa)/.test(t)) return 'quote';
  if (/(agendar|agenda|hor[aá]rio|marcar|visita)/.test(t)) return 'schedule';
  if (/(garantia)/.test(t)) return 'warranty';
  if (/(instalar|instala[cç][aã]o)/.test(t)) return 'install';
  if (/(micro|micro-ondas|forno|cooktop|fog[aã]o|coifa)/.test(t)) return 'repair';
  return 'other';
}

function extractEquipmentMention(text) {
  const t = String(text || '').toLowerCase();
  if (/micro\s*-?ondas|microondas/.test(t)) return 'micro-ondas';
  if (/forno/.test(t)) return 'forno';
  if (/cooktop/.test(t)) return 'cooktop';
  if (/fog[aã]o/.test(t)) return 'fogao';
  if (/coifa/.test(t)) return 'coifa';
  return 'unknown';
}

function isBotLoopLike(outBodies) {
  // Detecta repetição exata das últimas respostas (sinal de loop)
  if (!Array.isArray(outBodies) || outBodies.length < 4) return false;
  const norm = outBodies
    .map((s) => String(s || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (norm.length < 4) return false;
  const last = norm[0];
  const sameCount = norm.slice(0, 4).filter((x) => x === last).length;
  return sameCount >= 3;
}

async function main() {
  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const days = Math.max(1, Math.min(90, Number(process.env.REPORT_DAYS || 30) || 30));
  const maxMessages = Math.max(5000, Math.min(200000, Number(process.env.REPORT_MAX_MESSAGES || 80000) || 80000));
  const maxSessions = Math.max(200, Math.min(5000, Number(process.env.REPORT_MAX_SESSIONS || 2000) || 2000));
  const pageSize = Math.max(500, Math.min(5000, Number(process.env.REPORT_PAGE_SIZE || 2000) || 2000));

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const bySession = new Map();
  let fetched = 0;
  let page = 0;

  while (fetched < maxMessages && bySession.size < maxSessions) {
    const fromIdx = page * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    const { data, error } = await sb
      .from('bot_messages')
      .select('session_id,direction,body,created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .range(fromIdx, toIdx);

    if (error) throw new Error(error.message || String(error));
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) break;

    fetched += rows.length;
    page += 1;

    for (const m of rows) {
      const sid = String(m.session_id || '');
      if (!sid) continue;
      let s = bySession.get(sid);
      if (!s) {
        s = {
          session_id: sid,
          in_count: 0,
          out_count: 0,
          first_at: null,
          last_at: null,
          last_in_at: null,
          last_out_at: null,
          last_in_body: null,
          last_out_body: null,
          last_out_bodies: [],
          intents: {},
          equipment_mentions: {},
        };
        bySession.set(sid, s);
      }

      const at = m.created_at ? String(m.created_at) : null;
      const body = typeof m.body === 'string' ? m.body : m.body == null ? '' : String(m.body);
      if (at) {
        if (!s.first_at) s.first_at = at;
        s.last_at = s.last_at || at;
      }

      const dir = String(m.direction || '');
      if (dir === 'in') {
        s.in_count += 1;
        if (!s.last_in_at && at) {
          s.last_in_at = at;
          s.last_in_body = body;
        }
        const intent = classifyIntentFromInbound(body);
        s.intents[intent] = (s.intents[intent] || 0) + 1;
        const eq = extractEquipmentMention(body);
        s.equipment_mentions[eq] = (s.equipment_mentions[eq] || 0) + 1;
      } else if (dir === 'out') {
        s.out_count += 1;
        if (!s.last_out_at && at) {
          s.last_out_at = at;
          s.last_out_body = body;
        }
        if (s.last_out_bodies.length < 8) s.last_out_bodies.unshift(body);
      }

      if (bySession.size >= maxSessions) break;
    }
  }

  const sessionIds = [...bySession.keys()];
  // Carrega meta das sessões (peer/channel) de uma vez
  const { data: sess, error: sErr } = await sb
    .from('bot_sessions')
    .select('id,channel,peer_id,state')
    .in('id', sessionIds);
  if (sErr) throw new Error(sErr.message || String(sErr));

  const metaById = new Map();
  for (const s of Array.isArray(sess) ? sess : []) metaById.set(String(s.id), s);

  // Agregações
  const totals = {
    sessions_sampled: sessionIds.length,
    messages_fetched: fetched,
    cutoff,
    days,
    intents: {},
    equipment_mentions: {},
    outcomes: {
      quotes_delivered: 0,
      accepted_service: 0,
      scheduled: 0,
      handoff_paused: 0,
    },
    pain: {
      bot_loop_like: 0,
      high_in_low_out: 0,
      asks_human_but_no_handoff: 0,
    },
  };

  const examples = {
    loop_like: [],
    high_in_low_out: [],
    asks_human_but_no_handoff: [],
  };

  for (const sid of sessionIds) {
    const s = bySession.get(sid);
    const meta = metaById.get(sid) || {};
    const peerAnon = anonPeer(meta.peer_id);

    for (const [k, v] of Object.entries(s.intents)) totals.intents[k] = (totals.intents[k] || 0) + Number(v || 0);
    for (const [k, v] of Object.entries(s.equipment_mentions)) totals.equipment_mentions[k] = (totals.equipment_mentions[k] || 0) + Number(v || 0);

    const state = meta.state || {};
    if (state.orcamento_entregue) totals.outcomes.quotes_delivered += 1;
    if (state.accepted_service) totals.outcomes.accepted_service += 1;
    if (state.schedule_confirmed) totals.outcomes.scheduled += 1;
    if (state.handoff_paused) totals.outcomes.handoff_paused += 1;

    const loopLike = isBotLoopLike(s.last_out_bodies);
    if (loopLike) {
      totals.pain.bot_loop_like += 1;
      if (examples.loop_like.length < 6) {
        examples.loop_like.push({
          session: peerAnon,
          in_count: s.in_count,
          out_count: s.out_count,
          last_in: clip(s.last_in_body),
          last_out: clip(s.last_out_body),
        });
      }
    }

    if (s.in_count >= 6 && s.out_count <= 1) {
      totals.pain.high_in_low_out += 1;
      if (examples.high_in_low_out.length < 6) {
        examples.high_in_low_out.push({
          session: peerAnon,
          in_count: s.in_count,
          out_count: s.out_count,
          last_in: clip(s.last_in_body),
          last_out: clip(s.last_out_body),
        });
      }
    }

    const askedHuman = (s.intents.handoff || 0) >= 1;
    const didHandoff = !!state.handoff_paused;
    if (askedHuman && !didHandoff) {
      totals.pain.asks_human_but_no_handoff += 1;
      if (examples.asks_human_but_no_handoff.length < 6) {
        examples.asks_human_but_no_handoff.push({
          session_id: sid,
          session: peerAnon,
          in_count: s.in_count,
          out_count: s.out_count,
          last_in: clip(s.last_in_body),
          last_out: clip(s.last_out_body),
          stage: state.stage || null,
        });
      }
    }
  }

  // Ordena intents/equip por volume
  function sortObjDesc(obj) {
    return Object.fromEntries(Object.entries(obj).sort((a, b) => Number(b[1]) - Number(a[1])));
  }
  totals.intents = sortObjDesc(totals.intents);
  totals.equipment_mentions = sortObjDesc(totals.equipment_mentions);

  const report = { ok: true, totals, examples };

  const outDir = path.resolve(process.cwd(), 'scripts', 'out');
  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `last${days}d_report.json`);
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const mdLines = [];
  mdLines.push(`# Atendimento — últimos ${days} dias (amostra)`);
  mdLines.push('');
  mdLines.push(`Cutoff (UTC): ${cutoff}`);
  mdLines.push(`Mensagens lidas (amostra): ${fetched}`);
  mdLines.push(`Sessões analisadas (amostra): ${totals.sessions_sampled}`);
  mdLines.push('');
  mdLines.push('## Outcomes (baseado no state da sessão)');
  mdLines.push(`- orcamento_entregue: ${totals.outcomes.quotes_delivered}`);
  mdLines.push(`- accepted_service: ${totals.outcomes.accepted_service}`);
  mdLines.push(`- schedule_confirmed: ${totals.outcomes.scheduled}`);
  mdLines.push(`- handoff_paused: ${totals.outcomes.handoff_paused}`);
  mdLines.push('');
  mdLines.push('## Intenções (contagem de mensagens inbound)');
  for (const [k, v] of Object.entries(totals.intents).slice(0, 12)) mdLines.push(`- ${k}: ${v}`);
  mdLines.push('');
  mdLines.push('## Equipamento mencionado (contagem de mensagens inbound)');
  for (const [k, v] of Object.entries(totals.equipment_mentions).slice(0, 12)) mdLines.push(`- ${k}: ${v}`);
  mdLines.push('');
  mdLines.push('## Possíveis dores (heurísticas)');
  mdLines.push(`- loop_like (últimas respostas repetidas): ${totals.pain.bot_loop_like}`);
  mdLines.push(`- high_in_low_out (muitos inputs, pouca resposta): ${totals.pain.high_in_low_out}`);
  mdLines.push(`- pediu humano, mas sem handoff_paused: ${totals.pain.asks_human_but_no_handoff}`);
  mdLines.push('');

  function addExamples(title, arr) {
    mdLines.push(`### ${title}`);
    if (!arr.length) {
      mdLines.push('- (nenhum exemplo na amostra)');
      mdLines.push('');
      return;
    }
    for (const ex of arr) {
      mdLines.push(`- ${ex.session} | in=${ex.in_count ?? ''} out=${ex.out_count ?? ''} stage=${ex.stage ?? ''}`);
      if (ex.last_in) mdLines.push(`  - last_in: ${ex.last_in}`);
      if (ex.last_out) mdLines.push(`  - last_out: ${ex.last_out}`);
    }
    mdLines.push('');
  }

  addExamples('Loop-like', examples.loop_like);
  addExamples('High in / low out', examples.high_in_low_out);
  addExamples('Pediu humano sem handoff', examples.asks_human_but_no_handoff);

  const mdPath = path.join(outDir, `last${days}d_report.md`);
  await fs.writeFile(mdPath, mdLines.join('\n'), 'utf8');

  // Console output: curto (para não lotar logs)
  console.log(JSON.stringify({
    ok: true,
    out: { json: jsonPath, md: mdPath },
    totals,
  }, null, 2));
}

main().catch((e) => {
  console.error('[last30d-report] error:', e?.message || String(e));
  process.exit(1);
});
