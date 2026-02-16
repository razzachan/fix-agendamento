/*
  Production E2E battery against webhook-ai test endpoints.
  - Enables test-mode to mark created appointments as is_test (no OS creation on Fix API).
  - Uses peers that end with an allowed digit suffix (see webhook-ai/src/services/testMode.ts).

  Usage (PowerShell):
    $env:WEBHOOK_BASE='https://webhook-ai-docker-production.up.railway.app'
    node scripts/prod-e2e-battery.js
*/

const base = process.env.WEBHOOK_BASE || 'https://webhook-ai-docker-production.up.railway.app';

// Must end with a digit sequence allowed by testMode.ts (default is 48991962111)
const allowedSuffix = process.env.TEST_ALLOWED_SUFFIX || '48991962111';

const fetchFn = global.fetch;
if (!fetchFn) throw new Error('Node 18+ required (global fetch missing)');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function get(path) {
  const url = `${base}${path}`;
  const resp = await fetchFn(url, { method: 'GET' });
  const txt = await resp.text();
  let j;
  try {
    j = JSON.parse(txt);
  } catch {
    j = { raw: txt };
  }
  return { ok: resp.ok, status: resp.status, data: j };
}

async function post(path, body) {
  const url = `${base}${path}`;
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await resp.text();
  let j;
  try {
    j = JSON.parse(txt);
  } catch {
    j = { raw: txt };
  }
  return { ok: resp.ok, status: resp.status, data: j };
}

async function resetSession(peer) {
  await post('/sessions/reset', { peer, channel: 'whatsapp' });
}

async function send(peer, msg, pauseMs = 180) {
  await sleep(pauseMs);
  const r = await post('/test-message', { from: peer, body: msg, channel: 'whatsapp' });
  const reply = r?.data?.reply;
  const preview = typeof reply === 'string' ? reply.slice(0, 220) : JSON.stringify(reply).slice(0, 220);
  console.log('  →', msg, '\n    =', preview.replace(/\s+/g, ' ').trim());
  return r;
}

async function getSession(peer) {
  const r = await post('/test-session', { from: peer, channel: 'whatsapp' });
  return r?.data;
}

function makePeer(prefix) {
  // Ensure digits end with allowedSuffix so test-mode allowlist matches (endsWith).
  return `${prefix}${allowedSuffix}@c.us`;
}

function looksConfirmed(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('agendamento confirmado') ||
    /agendamento[_ ]confirmado/.test(t) ||
    (t.includes('agendamento') && (t.includes('existe') || t.includes('exis')))
  );
}

async function runScenario(name, peer, steps, expectScheduled = false) {
  console.log(`\n=== ${name} (${peer}) ===`);
  await resetSession(peer);
  let lastReply = '';
  for (const s of steps) {
    const r = await send(peer, s.msg, s.pauseMs);
    lastReply = r?.data?.reply || '';
  }

  // If bot offered slots and we didn't choose, choose 1.
  if (/Hor[áa]rios dispon[íi]veis|tenho estes hor/i.test(String(lastReply || ''))) {
    await send(peer, '1', 260);
    const rr = await post('/test-message', { from: peer, body: '1', channel: 'whatsapp' });
    lastReply = rr?.data?.reply || lastReply;
  }

  if (expectScheduled) {
    const sess = await getSession(peer);
    const stage = sess?.state?.stage;
    const confirmed = !!(sess?.state?.schedule_confirmed);
    const ok = stage === 'scheduled' && confirmed;
    if (!ok) {
      throw new Error(`Expected scheduled=true. Got stage=${stage} confirmed=${confirmed}. LastReply=${String(lastReply).slice(0, 200)}`);
    }
    if (!looksConfirmed(lastReply)) {
      console.warn('WARN: session scheduled but reply not clearly confirmed');
    }
  }

  return { lastReply };
}

(async () => {
  console.log('Base:', base);

  const health = await get('/health');
  console.log('Health:', health.status, health.data?.ok ?? health.data);

  const wa = await get('/whatsapp/status');
  console.log('WhatsApp:', wa.status, wa.data?.connected ? 'connected' : 'NOT connected', wa.data?.qr ? '(qr present)' : '');

  // Enable test-mode so our scheduling flow marks appointments as is_test.
  const en = await post('/test-mode/enable', {});
  console.log('Test-mode enable:', en.status, en.data);

  // 1) Human handoff pause/resume
  await runScenario(
    'Handoff (humano) + voltar ao bot',
    makePeer('5511001'),
    [{ msg: 'quero falar com um humano' }, { msg: 'voltar ao bot', pauseMs: 260 }],
    false
  );
  {
    const sess = await getSession(makePeer('5511001'));
    const st = sess?.state || {};
    if (st.stage !== 'collecting_core' || st.human_requested_at != null) {
      throw new Error(`Expected unpaused collecting_core + human_requested_at null; got stage=${st.stage} human_requested_at=${st.human_requested_at}`);
    }
  }

  // 2) Warranty (should ask for OS, not crash)
  await runScenario('Garantia (pergunta OS)', makePeer('5511002'), [{ msg: 'quero saber da garantia' }], false);

  // 3) Installation → switch to maintenance
  await runScenario(
    'Instalação → troca para manutenção',
    makePeer('5511003'),
    [
      { msg: 'quero instalar um cooktop' },
      // Use um sintoma claro de manutenção para sair do modo instalação
      { msg: 'na verdade preciso de conserto no microondas, nao esquenta' },
      { msg: 'marca LG' },
      { msg: 'é de bancada' },
    ],
    false
  );

  // 4) Full scheduling (at least one end-to-end)
  const common = (idx, equipamento, marca, problema) => {
    const email = `teste+${idx}@example.com`;
    const cpf = String(10000000000 + idx);
    return [
      { msg: equipamento },
      { msg: marca },
      { msg: problema },
      { msg: 'quanto fica?' },
      { msg: 'gostaria sim' },
      { msg: 'Meu nome eh Teste da Silva' },
      { msg: 'Endereco: Rua Teste, 123, Centro, Florianopolis - SC, CEP 88000-000, complemento: apto 101' },
      { msg: `cpf ${cpf}` },
      { msg: `email: ${email}` },
      { msg: '1', pauseMs: 260 },
    ];
  };

  await runScenario(
    'E2E Agendamento - Fogão a gás',
    makePeer('5512001'),
    common(1, 'fogao a gas', 'Brastemp', 'nao acende'),
    true
  );

  // 5) Coverage: a few more equipment types to exercise routing + scheduling
  await runScenario(
    'E2E Agendamento - Cooktop',
    makePeer('5512002'),
    [
      { msg: 'cooktop a gas 5 bocas' },
      { msg: 'Consul' },
      // Alguns fluxos pedem confirmação gás/elétrico/indução
      { msg: 'a gas' },
      { msg: 'chamas fracas' },
      { msg: 'quanto fica?' },
      { msg: 'gostaria sim' },
      { msg: 'Meu nome eh Teste da Silva' },
      { msg: 'Endereco: Rua Teste, 123, Centro, Florianopolis - SC, CEP 88000-000, complemento: apto 101' },
      { msg: 'cpf 10000000002' },
      { msg: 'email: teste+2@example.com' },
      { msg: '1', pauseMs: 260 },
    ],
    true
  );

  await runScenario(
    'E2E Agendamento - Micro-ondas bancada',
    makePeer('5512003'),
    common(3, 'microondas de bancada', 'LG', 'nao esquenta'),
    true
  );

  await runScenario(
    'E2E Agendamento - Forno elétrico embutido',
    makePeer('5512004'),
    common(4, 'forno eletrico embutido', 'Fischer', 'nao liga'),
    true
  );

  await runScenario(
    'E2E Agendamento - Coifa',
    makePeer('5512005'),
    common(5, 'coifa', 'Suggar', 'suga pouco'),
    true
  );

  await runScenario(
    'E2E Agendamento - Máquina de lavar',
    makePeer('5512006'),
    common(6, 'maquina de lavar', 'Samsung', 'nao centrifuga'),
    true
  );

  // Disable test-mode after battery
  const dis = await post('/test-mode/disable', {});
  console.log('\nTest-mode disable:', dis.status, dis.data);

  console.log('\nDONE: prod battery OK');
})().catch((e) => {
  console.error('\nPROD BATTERY FAILED:', e?.stack || e);
  process.exit(1);
});
