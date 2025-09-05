// deno-lint-ignore-file no-explicit-any
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { userId, subscription } = await req.json()
    if (!userId || !subscription) {
      return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const upsert = {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(upsert, { onConflict: 'endpoint' })
      .select('*')

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    return new Response(JSON.stringify({ ok: true, data }), { headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as any).message }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})

