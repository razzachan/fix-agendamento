#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function toISOAtLocal07BRT(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}T07:00:00-03:00`;
}

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { since: null, limitPeers: 50, maxExamples: 3 };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a.startsWith('--since=')) out.since = a.split('=')[1];
    else if (a === '--since' && args[i+1]) { out.since = args[i+1]; i++; }
    else if (a.startsWith('--limit-peers=')) out.limitPeers = Number(a.split('=')[1]||'50');
    else if (a.startsWith('--max-examples=')) out.maxExamples = Number(a.split('=')[1]||'3');
  }
  return out;
}

function ms(x){ return x instanceof Date ? x.getTime() : Date.parse(x); }
function fmt(x){ return new Date(x).toISOString().replace('T',' ').replace('Z',' UTC'); }

async function main(){
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

  const { since: argSince, limitPeers, maxExamples } = parseArgs();
  const sinceISO = argSince || toISOAtLocal07BRT();
  console.log(`🔎 Buscando double replies desde ${sinceISO}`);

  const { data: msgs, error: e1 } = await supabase
    .from('bot_messages')
    .select('id, session_id, direction, body, created_at')
    .gte('created_at', sinceISO)
    .order('created_at', { ascending: true })
    .limit(20000);
  if (e1){ console.error('Erro carregando bot_messages:', e1.message); process.exit(1); }

  const sessionIds = [...new Set((msgs||[]).map(m=>m.session_id).filter(Boolean))];
  let sessions = {};
  if (sessionIds.length){
    const { data: sess, error: e2 } = await supabase
      .from('bot_sessions')
      .select('id, channel, peer_id')
      .in('id', sessionIds)
      .order('peer_id', { ascending: true });
    if (e2){ console.error('Erro carregando bot_sessions:', e2.message); process.exit(1); }
    for (const s of (sess||[])) sessions[s.id] = s;
  }

  const byPeer = new Map();
  for (const m of (msgs||[])){
    const s = sessions[m.session_id] || {};
    if (s.channel !== 'whatsapp') continue;
    const peer = s.peer_id || 'unknown';
    if (!byPeer.has(peer)) byPeer.set(peer, []);
    byPeer.get(peer).push({ ...m, peer });
  }

  const events = [];
  for (const [peer, list] of byPeer.entries()){
    list.sort((a,b)=>ms(a.created_at)-ms(b.created_at));
    let pendingIn = null;
    let outsAfter = [];
    for (const m of list){
      if (m.direction === 'in'){
        if (pendingIn && outsAfter.length > 1){
          events.push({ peer, inbound_at: pendingIn.created_at, inbound: (pendingIn.body||'').slice(0,140), outs: outsAfter.map(o=>({ at:o.created_at, body:(o.body||'').slice(0,140) })) });
        }
        pendingIn = m; outsAfter = [];
      } else { // out
        if (pendingIn) outsAfter.push(m);
      }
    }
    if (pendingIn && outsAfter.length > 1){
      events.push({ peer, inbound_at: pendingIn.created_at, inbound: (pendingIn.body||'').slice(0,140), outs: outsAfter.map(o=>({ at:o.created_at, body:(o.body||'').slice(0,140) })) });
    }
  }

  console.log(`\n===== DOUBLE REPLIES =====`);
  console.log(`Peers com ocorrências: ${new Set(events.map(e=>e.peer)).size}`);
  console.log(`Total de ocorrências: ${events.length}`);

  // Mostrar até N exemplos por peer
  const byPeerEvents = new Map();
  for (const ev of events){ if (!byPeerEvents.has(ev.peer)) byPeerEvents.set(ev.peer, []); byPeerEvents.get(ev.peer).push(ev); }
  for (const [peer, evs] of byPeerEvents.entries()){
    console.log(`\n📱 ${peer} — ocorrências: ${evs.length}`);
    for (let i=0;i<Math.min(maxExamples, evs.length); i++){
      const e = evs[i];
      console.log(`  • IN ${fmt(e.inbound_at)}  ${e.inbound}`);
      for (const o of e.outs){ console.log(`    OUT ${fmt(o.at)}  ${o.body}`); }
    }
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });

