import { createClient } from '@supabase/supabase-js';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

function clip(text, n = 240) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

async function main() {
  const sid = String(process.argv[2] || process.env.SESSION_ID || '').trim();
  if (!sid) throw new Error('SESSION_ID is required');

  const url = requireEnv('SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: sess, error: sErr } = await sb
    .from('bot_sessions')
    .select('id,channel,peer_id,state')
    .eq('id', sid)
    .single();
  if (sErr) throw new Error(sErr.message || String(sErr));

  const { data: msgs, error: mErr } = await sb
    .from('bot_messages')
    .select('direction,body,created_at')
    .eq('session_id', sid)
    .order('created_at', { ascending: true })
    .limit(250);
  if (mErr) throw new Error(mErr.message || String(mErr));

  const rows = Array.isArray(msgs) ? msgs : [];

  const handoffHits = rows
    .filter((m) => String(m.direction) === 'in')
    .filter((m) => /\b(humano|atendente|pessoa|operador|transferir|falar\s+com)\b/i.test(String(m.body || '')))
    .map((m) => ({ at: m.created_at, body: clip(m.body, 260) }));

  console.log(
    JSON.stringify(
      {
        ok: true,
        session: {
          id: sess.id,
          channel: sess.channel,
          peer_id_suffix: String(sess.peer_id || '').replace(/\D+/g, '').slice(-4),
          stage: sess.state?.stage || null,
          handoff_paused: !!sess.state?.handoff_paused,
          bot_paused: !!sess.state?.bot_paused,
          human_requested: !!sess.state?.human_requested,
          human_requested_at: sess.state?.human_requested_at || null,
        },
        handoff_hits: handoffHits,
        transcript: rows.map((m) => ({
          at: m.created_at,
          dir: m.direction,
          body: clip(m.body, 300),
        })),
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('[drill-session] error:', e?.message || String(e));
  process.exit(1);
});
