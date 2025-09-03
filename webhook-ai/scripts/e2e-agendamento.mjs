import 'dotenv/config'

async function main(){
  process.env.LLM_FAKE_JSON = JSON.stringify({
    tool: 'createAppointment',
    input: { client_name: '', start_time: '2025-08-15T10:00:00', end_time: '2025-08-15T11:00:00', address: 'Centro', descricao: 'fogao nao acende' }
  })
  // O executor deve mapear descricao->description e preencher phone/client_name com peer
  // Simula orquestração WhatsApp: chamando tryExecuteTool via API não existe; então testamos a rota diretamente
  const resp = await fetch(`${process.env.API_URL||'http://localhost:3000'}/api/bot/tools/createAppointment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bot-token': process.env.BOT_TOKEN||'' },
    body: JSON.stringify({ client_name: '5511999999999', start_time: '2025-08-15T10:00:00', end_time: '2025-08-15T11:00:00', address: 'Centro', description: 'fogao nao acende' })
  })
  console.log('status', resp.status)
  const data = await resp.json()
  console.log('agendamento', data)
}

main().catch(e=>{ console.error(e); process.exit(1) })

