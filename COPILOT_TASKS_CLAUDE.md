# 🛠️ TAREFAS PARA O COPILOT — Fix Fogões CRM

**Data:** 12 de Fevereiro de 2026  
**Contexto:** Sistema de automação WhatsApp + CRM para Fix Fogões (empresa de manutenção de eletrodomésticos em Florianópolis).

---

## 📋 VISÃO GERAL

O sistema tem 3 MCPs conectados ao Claude Desktop:

| MCP | Descrição |
|-----|-----------|
| `fixfogoes` | Tools da API Fix Fogões (leads, agenda, CRM) |
| `whatsapp-agendamento` | WhatsApp bridge porta 8080 (atendimento) |
| `whatsapp-gestao` | WhatsApp bridge porta 8081 (gestão interna) |

O arquivo do MCP `fixfogoes` está em:
```
C:\Users\akrom\OneDrive\Área de Trabalho\eletro-fix-hub-pro-main2\mcp\fixfogoes-mcp\index.js
```

A API backend está em:
```
https://api.fixfogoes.com.br  (ou https://eletro-fix-hub-pro-production.up.railway.app durante SSL)
```

Autenticação: `Authorization: Bearer <BOT_TOKEN>`

---

## 🔧 TAREFA 1 — Adicionar tools ao MCP `fixfogoes` (index.js)

O MCP já tem estas tools:
- `fix_health` → GET /health
- `fix_leads_pending` → GET /api/leads/pending
- `fix_get_availability` → POST /api/bot/tools/getAvailability
- `fix_create_appointment` → POST /api/bot/tools/createAppointment
- `fix_cancel_appointment` → POST /api/bot/tools/cancelAppointment

### Tools que precisam ser ADICIONADAS:

---

### 1.1 `fix_leads_all`
**Endpoint:** `GET /api/leads`  
**Descrição:** Lista todos os leads com filtros opcionais.

**Query params:**
```typescript
{
  status?: string;        // ex: "aguardando_resposta", "interessado"
  crm_status?: string;    // qualquer status do funil CRM
  score_min?: number;     // score mínimo (0-100)
  score_max?: number;     // score máximo (0-100)
  limit?: number;         // default 20
  page?: number;          // default 0
  order_by?: string;      // "crm_score", "created_at", "crm_last_interaction"
  order?: string;         // "asc" | "desc"
}
```

**Response:**
```typescript
{
  success: boolean;
  count: number;
  total: number;
  leads: Lead[];  // mesmo formato do /api/leads/pending com dados do cliente
}
```

---

### 1.2 `fix_lead_get`
**Endpoint:** `GET /api/leads/:id`  
**Descrição:** Busca um lead específico por ID.

**Input:**
```typescript
{ id: string }  // UUID do lead
```

**Response:** objeto Lead completo com dados do cliente.

---

### 1.3 `fix_lead_by_phone`
**Endpoint:** `GET /api/leads/by-phone/:phone`  
**Descrição:** Busca leads de um cliente pelo telefone.

**Input:**
```typescript
{ phone: string }  // ex: "48999999999" ou "5548999999999"
```

**Response:**
```typescript
{
  success: boolean;
  leads: Lead[];
  client: Client | null;
}
```

---

### 1.4 `fix_lead_update_status`
**Endpoint:** `PUT /api/leads/:id/status`  
**Descrição:** Atualiza o status CRM de um lead e adiciona nota opcional.

**Input:**
```typescript
{
  id: string;           // UUID do lead
  crm_status: string;   // novo status
  notes?: string;       // nota a adicionar
  crm_score?: number;   // score opcional para forçar recálculo
}
```

**Response:**
```typescript
{
  success: boolean;
  lead: Lead;
}
```

**Status válidos:**
`novo_lead`, `orcamento_enviado`, `aguardando_resposta`, `interessado`, `agendamento_pendente`, `coleta_agendada`, `em_diagnostico`, `orcamento_detalhado`, `aprovado`, `em_reparo`, `pronto_entrega`, `entregue`, `perdido`, `cancelado`

---

### 1.5 `fix_lead_add_note`
**Endpoint:** `POST /api/leads/:id/notes`  
**Descrição:** Adiciona uma nota ao histórico do lead.

**Input:**
```typescript
{
  id: string;
  note: string;
  author?: string;  // "claude", "paulo", "sistema"
}
```

**Response:**
```typescript
{
  success: boolean;
  lead: Lead;
}
```

---

### 1.6 `fix_appointments_list`
**Endpoint:** `GET /api/bot/tools/listAppointments`  
**Descrição:** Lista agendamentos/OS por período.

**Input:**
```typescript
{
  date_from?: string;  // YYYY-MM-DD
  date_to?: string;    // YYYY-MM-DD
  status?: string;     // "scheduled", "completed", "cancelled"
  limit?: number;
}
```

**Response:**
```typescript
{
  ok: boolean;
  appointments: Array<{
    id: string;
    start_time: string;
    end_time: string;
    client_name: string;
    phone: string;
    equipment_type: string;
    description: string;
    status: string;
    technician?: { id: string; name: string };
    service_order_id?: string;
  }>;
}
```

---

### 1.7 `fix_crm_metrics`
**Endpoint:** `GET /api/analytics/crm`  
**Descrição:** Retorna métricas do CRM (usa a view `crm_dashboard_metrics` do Supabase).

**Input:** nenhum (ou período opcional)

**Response:**
```typescript
{
  success: boolean;
  metrics: {
    novos_leads: number;
    orcamentos_enviados: number;
    aguardando_resposta: number;
    interessados: number;
    agendamentos_pendentes: number;
    coletas_agendadas: number;
    em_diagnostico: number;
    orcamentos_detalhados: number;
    aprovados: number;
    em_reparo: number;
    prontos_entrega: number;
    entregues: number;
    perdidos: number;
    leads_quentes: number;    // score >= 80
    leads_mornos: number;     // score 60-79
    leads_frios: number;      // score 40-59
    leads_congelados: number; // score < 40
  };
  period_days: number;  // últimos N dias
}
```

---

## 🗄️ TAREFA 2 — Endpoints da API que precisam ser criados/ajustados

### 2.1 `GET /api/leads`
Já existe `GET /api/leads/pending`. Criar versão completa com filtros (ver spec acima em 1.1).

### 2.2 `GET /api/leads/:id`
Busca lead por ID com join no cliente.

### 2.3 `GET /api/leads/by-phone/:phone`
Normaliza o telefone antes de buscar (remove +, 55, etc).

### 2.4 `POST /api/leads/:id/notes`
Adiciona nota ao array `crm_notes` da tabela `pre_schedules`.

### 2.5 `GET /api/bot/tools/listAppointments`
Lista eventos do calendário com filtros de data/status.

### 2.6 `GET /api/analytics/crm`
Consulta a view `crm_dashboard_metrics` do Supabase e retorna métricas.

---

## 🎨 TAREFA 3 — Frontend CRM (React + TypeScript + Tailwind + shadcn/ui)

O projeto frontend já existe em:
```
C:\Users\akrom\OneDrive\Área de Trabalho\eletro-fix-hub-pro-main2\frontend\
```

Stack atual: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase Client + React Query

### 3.1 Páginas a criar

#### `/crm` — Dashboard Principal

**Componentes:**

```
CRMDashboard/
├── MetricsBar           # KPIs no topo (leads hoje, agendados, aprovados, entregues)
├── HotLeadsList         # Leads com score > 80 em destaque
├── AlertsPanel          # Avisos: follow-ups vencidos, orçamentos sem resposta
├── FunnelMiniChart      # Mini funil de conversão
└── TodaySchedule        # Agendamentos do dia
```

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  📊 KPIs: [12 Leads] [5 Agendados] [3 Aprovados]│
├──────────────────────┬──────────────────────────┤
│  🔥 LEADS QUENTES    │  ⚠️ ALERTAS              │
│  João - Microondas   │  • 3 follow-ups vencidos │
│  Score: 85 | 2h      │  • 2 orçamentos >48h     │
│  [Responder]         │  • 1 coleta hoje 14h     │
├──────────────────────┴──────────────────────────┤
│  📅 AGENDA HOJE                                  │
│  14:00 - João Silva - Microondas - Campeche      │
└─────────────────────────────────────────────────┘
```

---

#### `/crm/leads` — Lista de Leads

**Funcionalidades:**
- Tabela com colunas: Nome, Telefone, Equipamento, Status, Score, Última Interação, Próximo Follow-up
- Filtros: status CRM, score (quente/morno/frio), período, busca por nome/telefone
- Ordenação por qualquer coluna
- Badge colorido de score (🔥 vermelho, ⭐ amarelo, 💤 cinza, ❄️ azul)
- Ações inline: Ver conversa, Atualizar status, Marcar como perdido
- Paginação
- Botão "Exportar CSV"

**Componentes:**
```
LeadsList/
├── LeadsFilters         # Filtros e busca
├── LeadsTable           # Tabela principal
│   ├── ScoreBadge       # Badge colorido de score
│   ├── StatusBadge      # Badge do status CRM
│   └── LeadActions      # Botões de ação
└── LeadsPagination
```

---

#### `/crm/leads/:id` — Detalhe do Lead

**Layout em duas colunas:**

```
┌──────────────────────┬──────────────────────────┐
│  DADOS DO CLIENTE    │  TIMELINE / HISTÓRICO    │
│  Nome: João Silva    │  ● 12/02 - Lead criado   │
│  Tel: 48999999999    │  ● 12/02 - Orçamento env │
│  End: Rua X, 123     │  ● 13/02 - Cliente resp. │
│  Score: 85 🔥        │  ● 14/02 - Agendado      │
│                      │                          │
│  EQUIPAMENTO         │  NOTAS                   │
│  Microondas          │  [+ Adicionar nota]      │
│  Problema: não aquece│                          │
│                      │                          │
│  STATUS CRM          │  AÇÕES                   │
│  [aguardando_resp ▼] │  [Agendar] [Follow-up]  │
│  [Salvar]            │  [Marcar perdido]        │
└──────────────────────┴──────────────────────────┘
```

---

#### `/crm/kanban` — Funil Kanban

**Colunas do kanban** (scroll horizontal):
```
NOVO → ORÇAMENTO → AGUARDANDO → INTERESSADO → AGENDADO → DIAGNÓSTICO → ORÇ.DETALHADO → APROVADO → REPARO → ENTREGUE
```

**Card do lead:**
```
┌─────────────────┐
│ 🔥 85  João S.  │
│ Microondas      │
│ não aquece      │
│ 2h atrás        │
│ [▶ Detalhes]    │
└─────────────────┘
```

- Drag and drop entre colunas (atualiza `crm_status` via API)
- Cor do card baseada no score
- Real-time via Supabase subscriptions

---

#### `/crm/analytics` — Analytics

**Gráficos:**
1. **Funil de conversão** (barras horizontais) — cada fase com % e quantidade
2. **Score distribution** (pizza/donut) — quente/morno/frio/congelado
3. **Leads por dia** (linha) — últimos 30 dias
4. **Motivos de perda** (pizza) — preço/comparando/silêncio/outros
5. **Taxa de conversão** (gauge) — lead → entregue

---

### 3.2 Componentes globais

```
components/crm/
├── ScoreBadge.tsx          # Badge colorido com ícone baseado no score
├── CrmStatusBadge.tsx      # Badge do status CRM com cor por fase do funil
├── LeadCard.tsx            # Card reutilizável (usado no kanban e lista)
├── FollowUpAlert.tsx       # Alerta de follow-up vencido
├── AddNoteModal.tsx        # Modal para adicionar nota
├── UpdateStatusModal.tsx   # Modal para mudar status com nota
└── LeadTimeline.tsx        # Timeline de histórico do lead
```

---

### 3.3 Hooks React Query

```typescript
// hooks/crm/
useLeads(filters)           // lista leads com filtros
useLead(id)                 // lead individual
useLeadsByPhone(phone)      // leads por telefone
useUpdateLeadStatus()       // mutation: atualizar status
useAddLeadNote()            // mutation: adicionar nota
useCrmMetrics()             // métricas do dashboard
useAppointments(dateRange)  // agendamentos
```

---

### 3.4 Real-time (Supabase)

Adicionar subscription em `pre_schedules` para atualizar o dashboard automaticamente quando:
- Novo lead criado
- Status atualizado
- Score recalculado

```typescript
// Em CRMDashboard e LeadsList
supabase
  .channel('crm_leads')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'pre_schedules'
  }, () => {
    queryClient.invalidateQueries(['leads']);
    queryClient.invalidateQueries(['crm_metrics']);
  })
  .subscribe();
```

---

### 3.5 Navegação

Adicionar no menu lateral existente:

```
├── Dashboard (já existe)
├── Ordens de Serviço (já existe)
├── Clientes (já existe)
├── Agenda (já existe)
├── ─────────────────
├── 🆕 CRM
│   ├── Dashboard CRM  → /crm
│   ├── Leads          → /crm/leads
│   ├── Kanban         → /crm/kanban
│   └── Analytics      → /crm/analytics
```

---

## 📦 ESTRUTURA DE ARQUIVOS SUGERIDA

```
frontend/src/
├── pages/
│   └── crm/
│       ├── CRMDashboard.tsx
│       ├── LeadsList.tsx
│       ├── LeadDetail.tsx
│       ├── LeadsKanban.tsx
│       └── CRMAnalytics.tsx
├── components/
│   └── crm/
│       ├── ScoreBadge.tsx
│       ├── CrmStatusBadge.tsx
│       ├── LeadCard.tsx
│       ├── LeadTimeline.tsx
│       ├── AddNoteModal.tsx
│       ├── UpdateStatusModal.tsx
│       ├── FollowUpAlert.tsx
│       ├── MetricsBar.tsx
│       ├── FunnelChart.tsx
│       └── KanbanColumn.tsx
├── hooks/
│   └── crm/
│       ├── useLeads.ts
│       ├── useLead.ts
│       ├── useCrmMetrics.ts
│       ├── useLeadMutations.ts
│       └── useRealtimeCrm.ts
└── types/
    └── crm.ts              # interfaces Lead, Client, CrmMetrics, etc.
```

---

## 🗂️ TIPOS TYPESCRIPT (crm.ts)

```typescript
export type CrmStatus =
  | 'novo_lead'
  | 'orcamento_enviado'
  | 'aguardando_resposta'
  | 'interessado'
  | 'agendamento_pendente'
  | 'coleta_agendada'
  | 'em_diagnostico'
  | 'orcamento_detalhado'
  | 'aprovado'
  | 'em_reparo'
  | 'pronto_entrega'
  | 'entregue'
  | 'perdido'
  | 'cancelado';

export interface Client {
  id: string;
  name: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  equipment_type: string;
  problem_description: string;
  urgency_level: 'high' | 'medium' | 'low';
  source: string;
  status: string;
  crm_status: CrmStatus;
  crm_score: number;
  crm_last_interaction: string;
  crm_next_followup: string | null;
  crm_notes: string[] | null;
  crm_tags: string[] | null;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export interface CrmMetrics {
  novos_leads: number;
  orcamentos_enviados: number;
  aguardando_resposta: number;
  interessados: number;
  agendamentos_pendentes: number;
  coletas_agendadas: number;
  em_diagnostico: number;
  orcamentos_detalhados: number;
  aprovados: number;
  em_reparo: number;
  prontos_entrega: number;
  entregues: number;
  perdidos: number;
  leads_quentes: number;
  leads_mornos: number;
  leads_frios: number;
  leads_congelados: number;
}

export type ScoreCategory = 'quente' | 'morno' | 'frio' | 'congelado';

export function getScoreCategory(score: number): ScoreCategory {
  if (score >= 80) return 'quente';
  if (score >= 60) return 'morno';
  if (score >= 40) return 'frio';
  return 'congelado';
}

export const SCORE_CONFIG = {
  quente:    { label: 'Quente',    icon: '🔥', color: 'red'    },
  morno:     { label: 'Morno',     icon: '⭐', color: 'yellow' },
  frio:      { label: 'Frio',      icon: '💤', color: 'gray'   },
  congelado: { label: 'Congelado', icon: '❄️', color: 'blue'   },
};

export const CRM_STATUS_LABELS: Record<CrmStatus, string> = {
  novo_lead:              'Novo Lead',
  orcamento_enviado:      'Orçamento Enviado',
  aguardando_resposta:    'Aguardando Resposta',
  interessado:            'Interessado',
  agendamento_pendente:   'Agendamento Pendente',
  coleta_agendada:        'Coleta Agendada',
  em_diagnostico:         'Em Diagnóstico',
  orcamento_detalhado:    'Orçamento Detalhado',
  aprovado:               'Aprovado',
  em_reparo:              'Em Reparo',
  pronto_entrega:         'Pronto p/ Entrega',
  entregue:               'Entregue ✅',
  perdido:                'Perdido ❌',
  cancelado:              'Cancelado',
};
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Backend / API
- [ ] `GET /api/leads` com filtros
- [ ] `GET /api/leads/:id`
- [ ] `GET /api/leads/by-phone/:phone`
- [ ] `POST /api/leads/:id/notes`
- [ ] `GET /api/bot/tools/listAppointments`
- [ ] `GET /api/analytics/crm`

### MCP fixfogoes (index.js)
- [ ] `fix_leads_all`
- [ ] `fix_lead_get`
- [ ] `fix_lead_by_phone`
- [ ] `fix_lead_update_status`
- [ ] `fix_lead_add_note`
- [ ] `fix_appointments_list`
- [ ] `fix_crm_metrics`

### Frontend
- [ ] Tipos TypeScript (`crm.ts`)
- [ ] Hooks React Query
- [ ] Componentes base (ScoreBadge, CrmStatusBadge, LeadCard)
- [ ] Página `/crm` — Dashboard
- [ ] Página `/crm/leads` — Lista
- [ ] Página `/crm/leads/:id` — Detalhe
- [ ] Página `/crm/kanban` — Kanban
- [ ] Página `/crm/analytics` — Analytics
- [ ] Real-time Supabase
- [ ] Navegação lateral

---

## 🔑 VARIÁVEIS DE AMBIENTE

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_API_URL=https://api.fixfogoes.com.br
```

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. O campo `clients` no lead vem de um JOIN com a tabela `clients` via `client_id`
2. O array `crm_notes` no Postgres é `TEXT[]` — ao adicionar nota, fazer `array_append`
3. O score é recalculado automaticamente pelo trigger/função `recalculate_lead_score(lead_id)`
4. A view `crm_dashboard_metrics` já existe no Supabase — usar diretamente
5. Drag & drop no Kanban deve chamar `PUT /api/leads/:id/status` ao soltar o card
6. Real-time só precisa invalidar queries do React Query — não precisa sincronizar estado manual
