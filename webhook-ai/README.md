# Webhook-AI

Este serviço expõe o webhook do bot (WhatsApp) e orquestra o fluxo de orçamento, agendamento, off-topic humanizado e handoff para atendente humano.

## Configuração rápida (.env)

1) Duplique `.env.example` como `.env` e ajuste:

```
PORT=3100
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sbp_..._service_role
OPENAI_API_KEY=sk-...

# Handoff humano
# 1) Preferencial: UUID do usuário no Supabase Auth
FIX_HANDOFF_ADMIN_ID=a1c05f82-f9fb-42b8-89ff-540046f61b80
# 2) Fallback por e-mail (deve ser admin em public.users)
FIX_HANDOFF_EMAIL=admin@fixfogoes.com.br

# Proteção do endpoint admin-only
ADMIN_API_KEY=defina-um-segredo-forte

# (Opcional) Desativar seed de admin no boot
# ADMIN_SEED_DISABLE=true
```

Observações:
- O serviço tenta resolver o admin alvo do handoff nesta ordem: `FIX_HANDOFF_ADMIN_ID` → `FIX_HANDOFF_EMAIL` → primeiro admin encontrado em `public.users`.
- O seed só cria um admin padrão se nenhum existir e é ignorado em testes. Pode ser desativado com `ADMIN_SEED_DISABLE=true`.

## Endpoints de saúde

- `GET /health`
  - Retorna status do serviço e campos adicionais: `supabase`, `admin_ok`, `admin_count`.

- `GET /admin/health` (apenas admin)
  - Header obrigatório: `x-admin-key: ${ADMIN_API_KEY}`
  - Retorno inclui:
    - `admin_count`, `admins` (id/email/role)
    - `handoff_target` (id/email resolvido)
    - `handoff_selected_by` (`env_admin_id` | `env_email` | `first_admin` | `none`)
    - `seed_disabled`

## Auditoria de handoff

Sempre que o cliente pedir atendimento humano e a notificação interna for criada, o serviço registra um evento em `bot_ai_router_logs` com:
- `event: "human_handoff_notified"`
- `payload: { to_admin_id, to_admin_email, selected_by, from, msg, equipamento, marca, problema }`

Se nenhum admin for encontrado, registra `event: "human_handoff"` com os dados do contato e contexto.

## Testes

- Executar a suíte: `npm --prefix webhook-ai run test`
- Os testes cobrem orçamento, agendamento, off-topic e handoff humano.



## Scripts de health admin

- Local (usa PORT ou ADMIN_HEALTH_URL do .env):
  - `npm --prefix webhook-ai run health:admin`
- Produção (usa ADMIN_HEALTH_URL_PROD do .env; fallback ADMIN_HEALTH_URL):
  - `npm --prefix webhook-ai run health:admin:prod`

Configuração de URLs no `.env` (exemplos):
```
# Local
ADMIN_HEALTH_URL=http://localhost:3100
# Produção
ADMIN_HEALTH_URL_PROD=https://sua-url-de-producao
```

## Executar em porta alternativa (evitar EADDRINUSE)

Se a porta 3100 já estiver em uso, rode com outra porta:
- PowerShell (Windows):
  - `$env:PORT=3210; npm --prefix webhook-ai run dev`
- bash (macOS/Linux):
  - `PORT=3210 npm --prefix webhook-ai run dev`

Em seguida, ajuste o script de health admin local:
- PowerShell: `$env:ADMIN_HEALTH_URL="http://localhost:3210"; npm --prefix webhook-ai run health:admin`
- bash: `ADMIN_HEALTH_URL=http://localhost:3210 npm --prefix webhook-ai run health:admin`
