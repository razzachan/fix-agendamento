#!/usr/bin/env node
/*
  Limpeza de sessões/mensagens do bot com mais de 90 dias.
  Uso: node api/scripts/botRetention.cjs [--days=90]
*/
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const DAYS = Number((process.argv.find(a=>a.startsWith('--days='))||'').split('=')[1] || 90)

async function main(){
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, key, { auth: { persistSession: false }})

  const cutoff = new Date(Date.now() - DAYS*24*60*60*1000).toISOString()
  console.log('🧹 Limpando mensagens/sessões anteriores a', cutoff)

  const { error: em } = await supabase.from('bot_messages').delete().lt('created_at', cutoff)
  if (em) console.error('Erro limpando mensagens:', em.message)

  const { error: es } = await supabase.from('bot_sessions').delete().lt('updated_at', cutoff)
  if (es) console.error('Erro limpando sessões:', es.message)

  console.log('✅ Limpeza concluída')
}

main().catch(e=>{ console.error(e); process.exit(1) })

