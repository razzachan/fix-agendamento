import 'dotenv/config'

async function main(){
  const api = process.env.API_URL || 'http://localhost:3000'
  const date = new Date().toISOString().slice(0,10)
  const res = await fetch(`${api}/api/bot/tools/getAvailability`, {
    method: 'POST', headers: {'Content-Type':'application/json', 'x-bot-token': process.env.BOT_TOKEN || ''},
    body: JSON.stringify({ date, duration: 60 })
  })
  if (!res.ok) throw new Error(`/getAvailability failed ${res.status}`)
  const data = await res.json()
  console.log('Slots:', (data.slots||[]).slice(0,5))
}

main().catch((e)=>{ console.error(e); process.exit(1) })

