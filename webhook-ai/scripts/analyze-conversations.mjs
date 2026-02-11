// Usage:
//   ADMIN_BASE_URL=https://<railway-url> ADMIN_API_KEY=... node scripts/analyze-conversations.mjs
// Optional:
//   LIMIT=100 CHANNEL=whatsapp PEER=5548... node scripts/analyze-conversations.mjs

const baseUrl = (process.env.ADMIN_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const adminKey = process.env.ADMIN_API_KEY;

if (!adminKey) {
  console.error('Missing ADMIN_API_KEY');
  process.exit(1);
}

const limit = Number(process.env.LIMIT || 100);
const channel = process.env.CHANNEL || 'whatsapp';
const peer = process.env.PEER || '';

const qs = new URLSearchParams();
qs.set('limit', String(Number.isFinite(limit) ? limit : 100));
if (channel) qs.set('channel', channel);
if (peer) qs.set('peer', peer);

const url = `${baseUrl}/admin/conversations?${qs.toString()}`;

const resp = await fetch(url, {
  headers: {
    'x-admin-key': adminKey,
  },
});

if (!resp.ok) {
  const txt = await resp.text();
  console.error(`HTTP ${resp.status}: ${txt}`);
  process.exit(1);
}

const json = await resp.json();
if (!json?.ok) {
  console.error('Unexpected response:', json);
  process.exit(1);
}

const sessions = Array.isArray(json.sessions) ? json.sessions : [];

let totalOut = 0;
let totalIn = 0;
let outCharsTotal = 0;
let shortOutTotal = 0;

for (const s of sessions) {
  const m = s?.metrics || {};
  totalIn += Number(m.in_count || 0);
  totalOut += Number(m.out_count || 0);
  outCharsTotal += Number(m.avg_out_chars || 0) * Number(m.out_count || 0);
  shortOutTotal += Math.round((Number(m.pct_out_short_240 || 0) / 100) * Number(m.out_count || 0));
}

const avgOut = totalOut ? Math.round(outCharsTotal / totalOut) : 0;
const pctShort = totalOut ? Math.round((shortOutTotal / totalOut) * 100) : 0;

console.log('Sessions:', sessions.length);
console.log('Messages in/out:', totalIn, '/', totalOut);
console.log('Avg out chars:', avgOut);
console.log('% out <= 240 chars (approx):', pctShort);

// Print a small sample of last messages for quick qualitative review
console.log('\nSample (last in/out per session):');
for (const s of sessions.slice(0, 12)) {
  console.log('---');
  console.log('session:', s.id, 'peer:', s.peer_id);
  console.log('last in :', (s.last?.in || '').replace(/\s+/g, ' ').trim());
  console.log('last out:', (s.last?.out || '').replace(/\s+/g, ' ').trim());
}
