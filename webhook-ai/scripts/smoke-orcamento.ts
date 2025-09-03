#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

async function main(){
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const sb = createClient(url, key, { auth: { persistSession: false }})

  // Simula entrada: "quero orçamento de fogão no centro"
  // Aqui só validamos que o orquestrador responde algo não vazio.
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

