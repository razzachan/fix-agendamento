#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

if (process.argv.length < 3){
  console.error('Usage: node scripts/showPeerLog.mjs <peer_id> [--since=2025-09-17T07:00:00-03:00]');
  process.exit(1);
}

function ms(x){ return x instanceof Date ? x.getTime() : Date.parse(x); }
function fmt(x){ return new Date(x).toISOString().replace('T',' ').replace('Z',' UTC'); }

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
const peer = process.argv[2];
const sinceArg = (process.argv.find(a=>a.startsWith('--since='))||'').split('=')[1] || null;
const since = sinceArg || new Date(Date.now() - 24*3600*1000).toISOString();

const { data: sess } = await supabase
  .from('bot_sessions')
  .select('id, updated_at')
  .eq('channel','whatsapp')
  .eq('peer_id', peer)
  .order('updated_at', { ascending: false })
  .limit(1);
const sid = sess && sess[0] && sess[0].id;
if (!sid){ console.error('No session found for peer'); process.exit(2); }

const { data: msgs } = await supabase
  .from('bot_messages')
  .select('direction, body, created_at')
  .eq('session_id', sid)
  .gte('created_at', since)
  .order('created_at', { ascending: true })
  .limit(200);

console.log(`Peer: ${peer}  Session: ${sid}  Since: ${since}`);
for (const m of (msgs||[])){
  const head = m.direction==='in' ? 'IN ' : 'OUT';
  const body = (m.body||'').replace(/\n/g,' \n ');
  console.log(`${head}  ${fmt(m.created_at)}  ${body}`);
}

