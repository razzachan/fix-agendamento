const base = process.env.WEBHOOK_BASE || 'http://localhost:3100';
const from = process.env.TEST_FROM || '5500012345678@c.us';

async function post(path, body) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let j;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  const preview = String(j.reply || j.message || j.status || JSON.stringify(j)).slice(0, 300);
  console.log(path, '→', preview);
  return j;
}

(async () => {
  console.log('Testing real flow against', base, 'from', from);
  await post('/sessions/reset', { peer: from, channel: 'whatsapp' });
  await post('/test-message', { from, body: 'fogao a gas' });
  await post('/test-message', { from, body: 'Brastemp' });
  await post('/test-message', { from, body: 'nao acende' });
  await post('/test-message', { from, body: 'gostaria sim' });
  await post('/test-message', { from, body: 'Meu nome eh Joao da Silva' });
  await post('/test-message', { from, body: 'Endereco: Rua A, 123, Centro, Belo Horizonte - MG, CEP 30123-456, complemento: apto 202' });
  await post('/test-message', { from, body: 'email: joao@example.com' });
  await post('/test-message', { from, body: 'cpf 12345678909' });
  await post('/test-message', { from, body: '1' });
})().catch(e => { console.error('Test failed', e); process.exit(1); });
