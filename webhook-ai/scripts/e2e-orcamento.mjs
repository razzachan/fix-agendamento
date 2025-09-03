import 'dotenv/config'

async function main(){
  // Força tool-call (JSON) no LLM para teste determinístico
  process.env.LLM_FAKE_JSON = JSON.stringify({
    tool: 'buildQuote',
    input: { equipment: 'fogao', region: 'Centro', urgency: 'normal' }
  })
  const resp = await fetch(`${process.env.API_URL||'http://localhost:3000'}/api/bot/tools/buildQuote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bot-token': process.env.BOT_TOKEN||'' },
    body: JSON.stringify({ service_type: 'fogao', region: 'Centro' })
  })
  console.log('status', resp.status)
  const data = await resp.json()
  console.log('orcamento', data)
}

main().catch(e=>{ console.error(e); process.exit(1) })

