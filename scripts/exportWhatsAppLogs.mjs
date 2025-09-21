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
  const out = { since: null, out: null };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a.startsWith('--since=')) out.since = a.split('=')[1];
    else if (a === '--since' && args[i+1]) { out.since = args[i+1]; i++; }
    else if (a.startsWith('--out=')) out.out = a.split('=')[1];
    else if (a === '--out' && args[i+1]) { out.out = args[i+1]; i++; }
  }
  return out;
}

function escCSV(v){
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
  return s;
}

function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

async function main(){
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});

  const { since: argSince, out: argOut } = parseArgs();
  const sinceISO = argSince || toISOAtLocal07BRT();
  const outDir = path.resolve('exports');
  ensureDir(outDir);
  const outFile = path.resolve(argOut || path.join(outDir, `whatsapp_logs_${sinceISO.replace(/[:]/g,'').replace(/\s+/g,'_')}.csv`));

  console.log(`📤 Exportando mensagens WhatsApp desde ${sinceISO} para ${outFile}`);

  // 1) Mensagens
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
      .select('id, channel, peer_id, updated_at')
      .in('id', sessionIds)
      .order('updated_at', { ascending: false });
    if (e2){ console.error('Erro carregando bot_sessions:', e2.message); process.exit(1); }
    for (const s of (sess||[])) sessions[s.id] = s;
  }

  // 2) CSV
  const header = ['peer_id','session_id','direction','created_at','body'];
  const lines = [header.join(',')];
  for (const m of (msgs||[])){
    const s = sessions[m.session_id] || {};
    if (s.channel !== 'whatsapp') continue;
    lines.push([
      escCSV(s.peer_id||''),
      escCSV(m.session_id||''),
      escCSV(m.direction||''),
      escCSV(m.created_at||''),
      escCSV((m.body||'').replace(/\r?\n/g,'\\n')),
    ].join(','));
  }
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8');
  console.log(`✅ Export concluído. Linhas: ${lines.length-1}`);
  console.log(outFile);
}

main().catch(e=>{ console.error(e); process.exit(1); });

