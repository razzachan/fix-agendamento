#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function toISOAtLocal07BRT(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}T07:00:00-03:00`;
}

function parseArgs(){
  const args = process.argv.slice(2);
  const out = { since: null };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a.startsWith('--since=')) out.since = a.split('=')[1];
    else if (a === '--since' && args[i+1]) { out.since = args[i+1]; i++; }
  }
  return out;
}

function ms(x){ return x instanceof Date ? x.getTime() : Date.parse(x); }
function fmtTs(x){ return new Date(x).toISOString().replace('T',' ').replace('Z',' UTC'); }
function escCSV(v){ const s=String(v??''); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

async function main(){
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

  const { since: argSince } = parseArgs();
  const sinceISO = argSince || toISOAtLocal07BRT();

  const outDir = path.resolve('exports');
  const transcriptsDir = path.join(outDir, 'transcripts');
  ensureDir(outDir); ensureDir(transcriptsDir);

  console.log(`📊 Resumindo conversas WhatsApp desde ${sinceISO}`);

  // 1) Carregar mensagens
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

  // 2) Agrupar por peer
  const byPeer = new Map();
  for (const m of (msgs||[])){
    const s = sessions[m.session_id] || {};
    if (s.channel !== 'whatsapp') continue;
    const peer = s.peer_id || 'unknown';
    if (!byPeer.has(peer)) byPeer.set(peer, []);
    byPeer.get(peer).push({ ...m, peer });
  }

  // 3) Calcular métricas por peer
  const report = [];
  for (const [peer, list] of byPeer.entries()){
    list.sort((a,b)=>ms(a.created_at)-ms(b.created_at));
    const firstAt = list.length ? list[0].created_at : null;
    const lastAt = list.length ? list[list.length-1].created_at : null;
    let inCount=0, outCount=0;
    for (const m of list){ if (m.direction==='in') inCount++; else if (m.direction==='out') outCount++; }

    // Gaps simples: tempo entre inbound e primeira resposta
    const gaps = [];
    let lastInbound = null;
    for (const m of list){
      if (m.direction==='in') lastInbound = m;
      else if (m.direction==='out' && lastInbound){
        const dt = ms(m.created_at)-ms(lastInbound.created_at);
        gaps.push(dt);
        lastInbound = null;
      }
    }
    // Gap pendente até agora
    if (lastInbound){ gaps.push(Date.now()-ms(lastInbound.created_at)); }
    const gapsMin = gaps.map(ms=>Math.round(ms/60000));
    const maxGapMin = gapsMin.length? Math.max(...gapsMin) : 0;

    // Loops (3+ mensagens iguais consecutivas do bot)
    let loops=0; let run=[];
    for (const m of list){
      if (m.direction==='out'){
        if (run.length===0 || (run[run.length-1].body||'')===(m.body||'')) run.push(m); else { if (run.length>=3) loops++; run=[m]; }
      } else { if (run.length>=3) loops++; run=[]; }
    }
    if (run.length>=3) loops++;

    // Transcript JSON
    const transcript = list.map(m=>({ direction:m.direction, created_at:m.created_at, body:m.body }));
    const safe = peer.replace(/[^0-9A-Za-z@._-]+/g,'_');
    fs.writeFileSync(path.join(transcriptsDir, `${safe}.json`), JSON.stringify({ peer, since: sinceISO, total:list.length, inCount, outCount, messages: transcript }, null, 2), 'utf8');

    report.push({ peer, total:list.length, inCount, outCount, firstAt, lastAt, maxGapMin, loops });
  }

  // 4) Ordenar por atividade
  report.sort((a,b)=> ms(b.lastAt||0)-ms(a.lastAt||0));

  // 5) Salvar CSV e JSON
  const baseName = `whatsapp_summary_${sinceISO.replace(/[:]/g,'').replace(/\s+/g,'_')}`;
  const csvFile = path.join(outDir, baseName + '.csv');
  const jsonFile = path.join(outDir, baseName + '.json');

  const header = ['peer','total_msgs','in_count','out_count','first_at','last_at','max_gap_min','loops'];
  const lines = [header.join(',')];
  for (const r of report){
    lines.push([
      escCSV(r.peer), escCSV(r.total), escCSV(r.inCount), escCSV(r.outCount), escCSV(r.firstAt), escCSV(r.lastAt), escCSV(r.maxGapMin), escCSV(r.loops)
    ].join(','));
  }
  fs.writeFileSync(csvFile, lines.join('\n'), 'utf8');
  fs.writeFileSync(jsonFile, JSON.stringify({ since: sinceISO, peers: report.length, items: report }, null, 2), 'utf8');

  console.log(`✅ Summary salvo:`);
  console.log(`- CSV: ${csvFile}`);
  console.log(`- JSON: ${jsonFile}`);
  console.log(`- Transcripts: ${transcriptsDir} (${report.length} arquivos)`);
}

main().catch(e=>{ console.error(e); process.exit(1); });

