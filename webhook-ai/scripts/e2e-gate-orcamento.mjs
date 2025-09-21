import 'dotenv/config'

const WEBHOOK = process.env.WEBHOOK_URL || 'http://localhost:3100'
const TEST_FROM = process.env.TEST_FROM || `55000000${Math.floor(1000+Math.random()*8999)}@c.us`

async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

async function expectIncludes(text, substrings){
  const ok = substrings.some(s => (text||'').toLowerCase().includes(String(s).toLowerCase()))
  if (!ok) throw new Error(`Resposta inesperada. Esperado conter uma de: ${substrings.join(' | ')}\nRecebido: ${text}`)
}

async function send(body){
  const r = await postJSON(`${WEBHOOK}/test-message`, { from: TEST_FROM, body })
  return r.reply || ''
}

async function main(){
  // Habilita test-mode (evita envios reais e libera rotas de teste)
  await postJSON(`${WEBHOOK}/test-mode/enable`, {})

  // 1) Caso fogão: afirmar tipo sem dar marca/problema ⇒ pode pedir "piso/cooktop" e "bocas" OU diretamente marca/problema
  let reply = await send('é a gás')
  const askedMountOrBrand = /piso|cooktop|bocas?/i.test(reply) || /marca do fogão|marca do equipamento/i.test(reply)
  if (!askedMountOrBrand) throw new Error('Esperava pergunta por piso/cooktop ou marca, recebe: '+reply)

  // 2) Se pediu montagem/bocas, responda. Depois deve pedir marca/problema.
  if (/piso|cooktop|bocas?/i.test(reply)){
    reply = await send('piso 4 bocas')
  }
  // Agora deve pedir marca ou problema
  await expectIncludes(reply, ['marca', 'problema'])

  // 3) Fornece apenas marca ⇒ deve pedir problema
  reply = await send('Brastemp')
  await expectIncludes(reply, ['problema específico', 'qual o problema'])

  // 4) Agora fornece problema ⇒ deve vir orçamento (texto com valor)
  reply = await send('não acende')
  await expectIncludes(reply, ['valor', 'r$'])

  // 4) Micro-ondas bancada: sem marca/problema ⇒ pedir antes de orçar
  reply = await send('tenho um micro-ondas de bancada')
  await expectIncludes(reply, ['marca do equipamento', 'qual é a marca'])

  // 5) Industrial/comercial: também deve pedir marca/problema
  reply = await send('forno industrial não está funcionando')
  await expectIncludes(reply, ['marca do equipamento', 'qual é a marca'])

  console.log('OK: Gate marca+problema validado para flujos chave.')
}

main().catch((e)=>{ console.error(e); process.exit(1) })

