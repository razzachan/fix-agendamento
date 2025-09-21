#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function toISOAtLocal07BRT(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  // Brasil (America/Sao_Paulo) não tem DST atualmente; offset -03:00
  return `${y}-${m}-${d}T07:00:00-03:00`;
}

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { since: null, thresholdMin: 10 };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a.startsWith('--since=')) out.since = a.split('=')[1];
    else if (a === '--since' && args[i+1]) { out.since = args[i+1]; i++; }
    else if (a.startsWith('--threshold=')) out.thresholdMin = Number(a.split('=')[1]||'10');
  }
  return out;
}

function ms(x){ return x instanceof Date ? x.getTime() : Date.parse(x); }
function fmtTs(x){ return new Date(x).toISOString().replace('T',' ').replace('Z',' UTC'); }

async function main(){
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

  const { since: argSince, thresholdMin } = parseArgs();
  const sinceISO = argSince || toISOAtLocal07BRT();
  console.log(`🔎 Auditando conversas WhatsApp desde ${sinceISO} (gaps > ${thresholdMin} min)`);

  // 1) Carregar mensagens desde as 07:00
  const { data: msgs, error: e1 } = await supabase
    .from('bot_messages')
    .select('id, session_id, direction, body, meta, created_at')
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })
    .limit(5000);
  if (e1){ console.error('Erro carregando bot_messages:', e1.message); process.exit(1); }
  const sessionIds = [...new Set((msgs||[]).map(m=>m.session_id).filter(Boolean))];

  // 2) Carregar sessões/peers
  let sessions = {};
  if (sessionIds.length){
    const { data: sess, error: e2 } = await supabase
      .from('bot_sessions')
      .select('id, channel, peer_id, updated_at')
      .in('id', sessionIds)
      .order('updated_at', { ascending: false });
    if (e2){ console.error('Erro carregando bot_sessions:', e2.message); process.exit(1); }
    for (const s of (sess||[])) sessions[s.id] = s;
  }

  // 3) Agrupar por peer (whatsapp)
  const byPeer = new Map();
  for (const m of (msgs||[])){
    const s = sessions[m.session_id] || {};
    if (s.channel !== 'whatsapp') continue;
    const peer = s.peer_id || 'unknown';
    if (!byPeer.has(peer)) byPeer.set(peer, []);
    byPeer.get(peer).push({ ...m, peer });
  }

  // 4) Detectar gaps por peer
  const GAP_MS = thresholdMin * 60 * 1000;
  const report = [];

  for (const [peer, list] of byPeer.entries()){
    list.sort((a,b)=>ms(a.created_at)-ms(b.created_at));
    const gaps = [];
    let lastInbound = null;
    for (const m of list){
      if (m.direction === 'in'){
        lastInbound = m;
      } else if (m.direction === 'out' && lastInbound){
        const dt = ms(m.created_at) - ms(lastInbound.created_at);
        if (dt > GAP_MS){
          gaps.push({
            since_inbound_at: lastInbound.created_at,
            first_reply_at: m.created_at,
            gap_min: Math.round(dt/60000),
            inbound_excerpt: (lastInbound.body||'').slice(0,120),
            reply_excerpt: (m.body||'').slice(0,120),
          });
        }
        lastInbound = null; // reset após primeira resposta
      }
    }

    // Gaps terminando sem resposta
    if (lastInbound){
      const now = Date.now();
      const dt = now - ms(lastInbound.created_at);
      if (dt > GAP_MS){
        gaps.push({
          since_inbound_at: lastInbound.created_at,
          first_reply_at: null,
          gap_min: Math.round(dt/60000),
          inbound_excerpt: (lastInbound.body||'').slice(0,120),
          reply_excerpt: null,
        });
      }
    }

    // Heurísticas de loops (mensagens repetidas do bot em sequência)
    const loops = [];
    let run = [];
    for (const m of list){
      if (m.direction === 'out'){
        if (run.length === 0 || (run[run.length-1].body||'') === (m.body||'')){
          run.push(m);
        } else {
          if (run.length >= 3) loops.push({
            occurrences: run.length,
            repeated_excerpt: (run[0].body||'').slice(0,140),
            from: run[0].created_at, to: run[run.length-1].created_at
          });
          run = [m];
        }
      } else {
        if (run.length >= 3) loops.push({
          occurrences: run.length,
          repeated_excerpt: (run[0].body||'').slice(0,140),
          from: run[0].created_at, to: run[run.length-1].created_at
        });
        run = [];
      }
    }
    if (run.length >= 3) loops.push({
      occurrences: run.length,
      repeated_excerpt: (run[0].body||'').slice(0,140),
      from: run[0].created_at, to: run[run.length-1].created_at
    });

    report.push({ peer, total_msgs: list.length, gaps, loops });
  }

  // 5) Impressão do relatório
  const peers = report.length;
  const gapsTotal = report.reduce((a,r)=>a + r.gaps.length, 0);
  const loopsTotal = report.reduce((a,r)=>a + r.loops.length, 0);

  console.log(`\n===== RESUMO =====`);
  console.log(`Peers auditados: ${peers}`);
  console.log(`Gaps detectados: ${gapsTotal}`);
  console.log(`Loops detectados: ${loopsTotal}`);

  for (const r of report){
    if (r.gaps.length === 0 && r.loops.length === 0) continue;
    console.log(`\n📱 ${r.peer} — msgs=${r.total_msgs} | gaps=${r.gaps.length} | loops=${r.loops.length}`);
    for (const g of r.gaps){
      console.log(`  ⚠️ Gap ${g.gap_min} min  | in=${fmtTs(g.since_inbound_at)}  -> out=${g.first_reply_at?fmtTs(g.first_reply_at):'—'}`);
      console.log(`     in:  ${(g.inbound_excerpt||'').replace(/\n/g,' ')}`);
      if (g.reply_excerpt) console.log(`     out: ${(g.reply_excerpt||'').replace(/\n/g,' ')}`);
    }
    for (const l of r.loops){
      console.log(`  🔁 Loop x${l.occurrences} (${fmtTs(l.from)} — ${fmtTs(l.to)}): ${(l.repeated_excerpt||'').replace(/\n/g,' ')}`);
    }
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });

