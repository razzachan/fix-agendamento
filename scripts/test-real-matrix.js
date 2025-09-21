/*
  Runs a matrix of real-flow scenarios against the webhook at http://localhost:3100
  Each scenario simulates a full conversation until scheduling confirmation.
*/

const base = process.env.WEBHOOK_BASE || 'http://localhost:3100';
const fetchFn = global.fetch || (await import('node-fetch')).default;

async function waitForHealth(maxTries = 20, delayMs = 250) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const resp = await fetchFn(`${base}/health`, { method: 'GET' });
      if (resp.ok) return true;
    } catch {}
    await sleep(delayMs);
  }
  return false;
}

async function post(path, body) {
  const url = `${base}${path}`;
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`${path} -> ${resp.status}`);
  const txt = await resp.text();
  return txt;
}

async function resetSession(from) {
  try {
    const txt = await post('/sessions/reset', { peer: from, channel: 'whatsapp' });
    log(`sessions/reset → ${txt}`);
  } catch (e) {
    log(`sessions/reset failed (${e.message})`);
  }
}

async function send(from, body) {
  const payload = { from, body, channel: 'whatsapp' };
  const txt = await post('/test-message', payload);
  log(`/test-message → ${ellipsis(txt, 200)}`);
  return txt;
}

function log(msg) { process.stdout.write(`${msg}\n`); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ellipsis(s, n) { return s.length <= n ? s : s.slice(0, n) + '…'; }

async function runScenario(s) {
  const from = s.from;
  log(`\n=== Scenario: ${s.name} (${from}) ===`);
  await resetSession(from);
  let last = '';
  for (const step of s.steps) {
    // tiny pacing to avoid race
    await sleep(step.pauseMs ?? 120);
    last = await send(from, step.msg);
  }
  // If the last message lists available time slots, send the selection again to confirm
  if (/Hor[áa]rios dispon[íi]veis/i.test(last)) {
    await sleep(180);
    last = await send(from, '1');
  }
  const low = (last || '').toLowerCase();
  const ok = /agendamento[_ ]confirmado/i.test(low)
    || low.includes('agendamento confirmado')
    || (low.includes('agendamento') && (low.includes('existe') || low.includes('exis')));
  return { name: s.name, ok, last };
}

function makeCommonSteps({ equipamento, marca, problema, idx }) {
  const email = `joao+${idx}@example.com`;
  const cpf = String(10000000000 + (idx % 999));
  return [
    { msg: equipamento },
    { msg: marca },
    { msg: problema },
    { msg: 'gostaria sim' },
    { msg: 'Meu nome eh Joao da Silva' },
    { msg: 'Endereco: Rua A, 123, Centro, Belo Horizonte - MG, CEP 30123-456, complemento: apto 202' },
    { msg: `cpf ${cpf}` },
    { msg: `email: ${email}` },
    { msg: '1', pauseMs: 250 },
  ];
}
function makeUrgentSteps({ equipamento, marca, problema, idx }) {
  const email = `maria+${idx}@example.com`;
  const cpf = String(10000001000 + (idx % 999));
  return [
    { msg: equipamento },
    { msg: marca },
    { msg: problema },
    { msg: 'gostaria sim, é urgente' },
    { msg: 'Meu nome eh Maria de Souza' },
    { msg: 'Endereco: Rua B, 456, Centro, Belo Horizonte - MG, CEP 30123-456, complemento: casa 2' },
    { msg: `cpf ${cpf} urgente` },
    { msg: `email: ${email}` },
    { msg: '1', pauseMs: 250 },
  ];
}

function makeInvalidOptionSteps({ equipamento, marca, problema, idx }) {
  const email = `ana+${idx}@example.com`;
  const cpf = String(10000002000 + (idx % 999));
  return [
    { msg: equipamento },
    { msg: marca },
    { msg: problema },
    { msg: 'gostaria sim' },
    { msg: 'Meu nome eh Ana Lima' },
    { msg: 'Endereco: Rua C, 789, Centro, Belo Horizonte - MG, CEP 30123-456, complemento: bloco 3' },
    { msg: `cpf ${cpf}` },
    { msg: `email: ${email}` },
    { msg: '4', pauseMs: 250 },
    { msg: '2', pauseMs: 300 },
  ];
}

function makeSwitchEquipmentSteps({ equipInicial, marcaInicial, problemaInicial, equipFinal, marcaFinal, problemaFinal, idx }) {
  const email = `carlos+${idx}@example.com`;
  const cpf = String(10000003000 + (idx % 999));
  return [
    { msg: equipInicial },
    { msg: marcaInicial },
    { msg: problemaInicial },
    { msg: 'nao, obrigado' },
    // troca de equipamento no meio
    { msg: equipFinal },
    { msg: marcaFinal },
    { msg: problemaFinal },
    { msg: 'gostaria sim' },
    { msg: 'Meu nome eh Carlos Pereira' },
    { msg: 'Endereco: Rua D, 101, Centro, Belo Horizonte - MG, CEP 30123-456, complemento: apto 501' },
    { msg: `cpf ${cpf}` },
    { msg: `email: ${email}` },
    { msg: '1', pauseMs: 250 },
  ];
}


const scenarios = [
  // Base scenarios
  {
    name: 'Fogão a gás - não acende',
    from: '550001000001@c.us',
    steps: makeCommonSteps({ equipamento: 'fogao a gas', marca: 'Brastemp', problema: 'nao acende', idx: 1 }),
  },
  {
    name: 'Cooktop - chamas fracas',
    from: '550001000002@c.us',
    steps: makeCommonSteps({ equipamento: 'cooktop 5 bocas', marca: 'Consul', problema: 'chamas fracas', idx: 2 }),
  },
  {
    name: 'Micro-ondas bancada - não esquenta',
    from: '550001000003@c.us',
    steps: makeCommonSteps({ equipamento: 'microondas bancada', marca: 'Electrolux', problema: 'nao esquenta', idx: 3 }),
  },
  {
    name: 'Geladeira - não gela',
    from: '550001000004@c.us',
    steps: makeCommonSteps({ equipamento: 'geladeira', marca: 'Brastemp', problema: 'nao gela', idx: 4 }),
  },
  {
    name: 'Máquina de Lavar - não centrifuga',
    from: '550001000005@c.us',
    steps: makeCommonSteps({ equipamento: 'maquina de lavar', marca: 'LG', problema: 'nao centrifuga', idx: 5 }),
  },
  {
    name: 'Forno elétrico - não liga',
    from: '550001000006@c.us',
    steps: makeCommonSteps({ equipamento: 'forno eletrico embutido', marca: 'Fischer', problema: 'nao liga', idx: 6 }),
  },
  {
    name: 'Lava-louças - não lava direito',
    from: '550001000007@c.us',
    steps: makeCommonSteps({ equipamento: 'lava loucas', marca: 'Brastemp', problema: 'nao lava direito', idx: 7 }),
  },
  {
    name: 'Coifa - suga pouco',
    from: '550001000008@c.us',
    // Coifa gate sometimes expects brand+problem together; send in one line to satisfy the gate
    steps: [
      { msg: 'coifa' },
      { msg: 'Marca Suggar, problema suga pouco' },
      { msg: 'gostaria sim' },
      { msg: 'Meu nome eh Joao da Silva' },
      { msg: 'Endereco: Rua A, 123, Centro, Belo Horizonte - MG, CEP 30123-456, complemento: apto 202' },
      { msg: 'cpf 10000000008' },
      { msg: 'email: joao+8@example.com' },
      { msg: '1', pauseMs: 250 },
    ],
  },
  {
    name: 'Adega climatizada - temperatura oscilando',
    from: '550001000009@c.us',
    steps: makeCommonSteps({ equipamento: 'adega climatizada', marca: 'Philco', problema: 'temperatura oscilando', idx: 9 }),
  },
  {
    name: 'Secadora - não seca',
    from: '550001000010@c.us',
    steps: makeCommonSteps({ equipamento: 'secadora', marca: 'Samsung', problema: 'nao seca', idx: 10 }),
  },
  // Extra scenarios
  {
    name: 'Geladeira - urgente (prioridade)',
    from: '550001100001@c.us',
    steps: makeUrgentSteps({ equipamento: 'geladeira', marca: 'Brastemp', problema: 'nao gela', idx: 101 }),
  },
  {
    name: 'Micro-ondas - opção inválida e recuperação',
    from: '550001100002@c.us',
    steps: makeInvalidOptionSteps({ equipamento: 'microondas bancada', marca: 'LG', problema: 'nao esquenta', idx: 102 }),
  },
  {
    name: 'Troca de equipamento no meio do fluxo (gate revalida)',
    from: '550001100003@c.us',
    steps: makeSwitchEquipmentSteps({
      equipInicial: 'fogao a gas', marcaInicial: 'Consul', problemaInicial: 'nao acende',
      equipFinal: 'microondas bancada', marcaFinal: 'Electrolux', problemaFinal: 'nao esquenta', idx: 103,
    }),
  }

];

(async () => {
  log(`Testing real matrix against ${base}`);
  // Aguarda o servidor ficar saudável para evitar ECONNREFUSED
  const healthy = await waitForHealth(40, 250);
  if (!healthy) {
    log('WARN: /health não respondeu OK após várias tentativas; seguindo mesmo assim...');
  }
  const results = [];
  for (const s of scenarios) {
    try {
      const r = await runScenario(s);
      results.push(r);
    } catch (e) {
      results.push({ name: (s && s.name) ? s.name : 'unknown', ok: false, last: String(e?.message || e) });
    }
    // small cooldown between scenarios
    await sleep(250);
  }
  const okCount = results.filter(r => r.ok).length;
  log(`\n=== Summary: ${okCount}/${results.length} OK ===`);
  for (const r of results) {
    log(` - ${r.name}: ${r.ok ? 'OK' : 'FAIL'}`);
  }
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    log('\n--- FAIL DETAILS ---');
    failed.forEach(f => log(`\n[${f.name || 'unknown'}]\n${ellipsis(String(f.last || ''), 800)}\n`));
    process.exit(1);
  } else {
    process.exit(0);
  }
})();

