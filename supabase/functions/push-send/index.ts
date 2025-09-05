// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('ANON_KEY')!
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@fixfogoes.com.br'

    // Admin client (service role) para DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Autenticação do chamador via JWT do Authorization header
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
    const caller = authData.user

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    const { userId, title, body, icon } = await req.json()

    // Checagem de permissão
    let isAdmin = false
    try {
      const { data: profile } = await supabase.from('users').select('role').eq('id', caller.id).single()
      isAdmin = profile?.role === 'admin'
    } catch (_) {}

    if (userId) {
      // Pode enviar para si mesmo, ou admin pode enviar para qualquer userId
      if (!isAdmin && userId !== caller.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }
    } else {
      // Broadcast somente admin
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
      }
    }

    const query = supabase.from('push_subscriptions').select('*')
    const { data: subs, error } = userId
      ? await query.eq('user_id', userId)
      : await query

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const payload = JSON.stringify({ title: title || 'Fix Fogões', body: body || '', icon: icon || '/icons/icon-192.png' })

    // Mapear linhas da tabela para o formato esperado pelo web-push
    const subsPayloads = (subs || []).map((s: any) => ({
      endpoint: s.endpoint,
      keys: { p256dh: s.p256dh, auth: s.auth },
    }))

    // Enviar notificações com tratamento robusto de erros por inscrição
    const toDelete: string[] = []
    let sentCount = 0

    for (const s of subsPayloads) {
      // Validar chaves base64url (A-Za-z0-9-_)
      const valid = /^[A-Za-z0-9_-]+$/.test(s.keys?.p256dh || '') && /^[A-Za-z0-9_-]+$/.test(s.keys?.auth || '')
      if (!valid) {
        toDelete.push(s.endpoint)
        continue
      }
      try {
        await webpush.sendNotification(s, payload)
        sentCount++
      } catch (err: any) {
        const code = err?.statusCode
        const msg: string = err?.message || ''
        if (code === 410 || code === 404 || msg.includes('Failed to decode base64url')) {
          toDelete.push(s.endpoint)
        }
      }
    }

    if (toDelete.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', toDelete)
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount, invalid: toDelete.length }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as any).message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})

