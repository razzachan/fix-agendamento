import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';

const BASE = process.env.API_BASE || 'http://localhost:3000';
const TOKEN = process.env.BOT_TOKEN || process.env.VITE_BOT_TOKEN || '';

async function waitForApi(timeoutMs=15000){
  const start = Date.now();
  while (Date.now()-start < timeoutMs){
    try{
      const r = await fetch(`${BASE}/api/status`);
      if (r.ok) return true;
    }catch{}
    await new Promise(r=>setTimeout(r, 300));
  }
  throw new Error('API não respondeu a tempo');
}

async function post(path, body, retries=2){
  let last;
  for (let i=0;i<=retries;i++){
    try{
      const r = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(TOKEN?{'x-bot-token':TOKEN}:{}) },
        body: JSON.stringify(body||{})
      });
      const j = await r.json().catch(()=>({}));
      if (r.status >= 500 && i < retries){
        await new Promise(r=>setTimeout(r, 500));
        continue;
      }
      return { status: r.status, ok: j.ok, data: j };
    }catch(e){ last=e; await new Promise(r=>setTimeout(r, 500)); }
  }
  throw last || new Error('Falha no POST');
}

await test('createAppointment cria evento com logistics_group e service_attendance_type', async () => {
  await waitForApi();
  const now = new Date();
  const toIso = (d)=> new Date(d).toISOString().split('.')[0]+"Z";
  const start = toIso(Date.now()+3*60*60*1000); // +3h p/ TZ
  const end = toIso(Date.now()+4*60*60*1000);
  const payload = {
    client_name: 'Teste Auto',
    start_time: start,
    end_time: end,
    address: 'Balneário Camboriú',
    description: 'Teste via API',
    equipment_type: 'fogao'
  };
  const { status, ok, data } = await post('/api/bot/tools/createAppointment', payload);
  assert.equal(status, 200);
  assert.equal(ok, true);
  assert.ok(data?.event?.logistics_group);
  assert.ok(data?.event?.service_attendance_type);
});

