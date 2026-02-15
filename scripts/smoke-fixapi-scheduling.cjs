/* eslint-disable no-console */

// Smoke test for Fix API scheduling tools:
// 1) smartSuggestions -> choose first suggestion
// 2) createAppointment (is_test=true)
// 3) cancelAppointment (cleanup)
//
// Uses token from env (FIX_BOT_TOKEN or BOT_TOKEN). Loads .env automatically.

require('dotenv').config();

const FIX_API_BASE = (process.env.FIX_API_BASE || 'https://api.fixfogoes.com.br').replace(/\/+$/, '');
const TOKEN = String(process.env.FIX_BOT_TOKEN || process.env.BOT_TOKEN || '').trim();

if (!TOKEN) {
  console.error('Missing FIX_BOT_TOKEN/BOT_TOKEN in environment.');
  process.exit(2);
}

async function httpJson(path, body) {
  const url = `${FIX_API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body || {}),
  });
  const text = await resp.text().catch(() => '');
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: resp.ok, status: resp.status, data };
}

async function main() {
  const address = 'Florianópolis - SC';
  const clientName = `SMOKE FixAPI ${new Date().toISOString()}`;
  const phone = '+5599999999999';
  const equipmentType = 'fogao';
  const description = 'SMOKE TEST (is_test=true)';

  console.log('1) smartSuggestions...');
  const s1 = await httpJson('/api/bot/tools/smartSuggestions', {
    address,
    equipment_type: equipmentType,
    urgent: false,
  });
  if (!s1.ok) {
    console.error('smartSuggestions failed', s1.status, s1.data);
    process.exit(1);
  }
  const suggestions = Array.isArray(s1.data?.suggestions) ? s1.data.suggestions : [];
  if (!suggestions.length) {
    console.error('No suggestions returned', s1.data);
    process.exit(1);
  }
  const chosen = suggestions[0];
  const start_time = chosen.from;
  const end_time = chosen.to;
  console.log('Chosen slot:', chosen.text || `${start_time} -> ${end_time}`);

  console.log('2) createAppointment (is_test=true)...');
  const s2 = await httpJson('/api/bot/tools/createAppointment', {
    client_name: clientName,
    start_time,
    end_time,
    address,
    description,
    phone,
    equipment_type: equipmentType,
    is_test: true,
  });
  if (!s2.ok) {
    console.error('createAppointment failed', s2.status, s2.data);
    process.exit(1);
  }
  const eventId = s2.data?.event?.id;
  console.log('Booked event id:', eventId);

  if (eventId) {
    console.log('3) cancelAppointment (cleanup)...');
    const s3 = await httpJson('/api/bot/tools/cancelAppointment', {
      id: eventId,
      reason: 'smoke test cleanup',
    });
    if (!s3.ok) {
      console.error('cancelAppointment failed', s3.status, s3.data);
      process.exit(1);
    }
    console.log('Cleanup ok.');
  } else {
    console.warn('No event id returned; skipping cleanup.');
  }

  console.log('Smoke test OK');
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
