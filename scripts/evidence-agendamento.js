/*
  Pequeno script para simular uma conversa real via webhook
  e capturar evidências no middleware (valor do pré-agendamento)
*/

const base = process.env.WEBHOOK_BASE || 'http://localhost:3100';
const mwBase = process.env.MW_BASE || 'http://127.0.0.1:8000';
const fetchFn = global.fetch || (await import('node-fetch')).default;

async function post(url, body) {
  const resp = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await resp.text();
  return { ok: resp.ok, status: resp.status, text: txt };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { process.stdout.write(String(msg) + '\n'); }

(async () => {
  const from = '559992222222@c.us';
  const telefoneDigits = from.replace(/\D+/g, '');

  log(`Webhook base: ${base}`);
  log(`Middleware base: ${mwBase}`);

  // reset session
  let r = await post(`${base}/sessions/reset`, { peer: from, channel: 'whatsapp' });
  log(`sessions/reset → [${r.status}] ${r.text}`);

  async function send(msg, pause=120) {
    await sleep(pause);
    const payload = { from, body: msg, channel: 'whatsapp' };
    const r = await post(`${base}/test-message`, payload);
    log(`/test-message '${msg}' → [${r.status}] ${r.text.slice(0, 280)}`);
    return r.text;
  }

  // conversation steps
  await send('geladeira');
  await send('Brastemp');
  await send('nao gela');
  await send('gostaria sim');
  await send('Meu nome eh Teste Valor');
  await send('Endereco: Rua Teste 123, Centro, Florianopolis - SC, 88000-000, complemento: apto 10');
  await send('cpf 12345678909');
  await send('email: teste+valor@example.com');

  // aguardar e solicitar oferta de horários explicitamente
  await sleep(800);
  await send('quero ver horarios disponiveis', 180);
  await sleep(600);

  // escolher opção 1
  const last = await send('1', 400);

  // Evidence from middleware
  const listResp = await fetchFn(`${mwBase}/api/agendamentos`);
  const listJson = listResp.ok ? await listResp.json() : null;
  const mine = listJson && listJson.data ? listJson.data.find(d => d.telefone === telefoneDigits) : null;
  if (mine) {
    log('--- PRE_AGENDAMENTO (resumo) ---');
    log(JSON.stringify({
      id: mine.id,
      created_at: mine.created_at,
      telefone: mine.telefone,
      valor_os_1: mine.valor_os_1,
      valor_servico: mine.valor_servico,
      valor_os: mine.valor_os,
      equipamento: mine.equipamento,
      problema: mine.problema,
      status: mine.status,
    }, null, 2));
  } else {
    log('ATENÇÃO: Pré-agendamento não encontrado para o telefone do teste.');
  }

  // print last bot reply
  log('--- ULTIMA_RESPOSTA_DO_BOT ---');
  log(last);
})();

