import 'dotenv/config'

async function main(){
  const api = process.env.API_URL || 'http://localhost:3000'
  const res = await fetch(`${api}/api/bot/tools/buildQuote`, {
    method: 'POST', headers: {'Content-Type':'application/json', 'x-bot-token': process.env.BOT_TOKEN || ''},
    body: JSON.stringify({ service_type: 'fogao', region: 'Centro' })
  })
  if (!res.ok) throw new Error(`/buildQuote failed ${res.status}`)
  const data = await res.json()
  console.log('Resultado orçamento:', data)
}

main().catch((e)=>{ console.error(e); process.exit(1) })

