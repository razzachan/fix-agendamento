# 1) Login e vincular projeto
supabase login
supabase link --project-ref hdyucwabemspehokoiks

# 2) Gerar chaves VAPID (se não tiver)
# No projeto:
npm run push:vapid
# Copie VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY que aparecerem

# 3) Setar secrets das Edge Functions (use a NOVA service_role rotacionada)
supabase secrets set \
SUPABASE_URL=https://hdyucwabemspehokoiks.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<NOVA_SERVICE_ROLE> \
VAPID_PUBLIC_KEY=<SUA_VAPID_PUBLIC_KEY> \
VAPID_PRIVATE_KEY=<SUA_VAPID_PRIVATE_KEY> \
VAPID_SUBJECT=mailto:<seu-email@dominio>

# 4) Deploy das Edge Functions
supabase functions deploy push-save-subscription
supabase functions deploy push-send