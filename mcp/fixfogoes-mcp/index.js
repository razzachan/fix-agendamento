import fetch from 'node-fetch';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const FIX_API_BASE = String(process.env.FIX_API_BASE || 'https://api.fixfogoes.com.br').replace(/\/$/, '');
const BOT_TOKEN = String(process.env.BOT_TOKEN || '').trim();

function authHeaders() {
  if (!BOT_TOKEN) return {};
  return { authorization: `Bearer ${BOT_TOKEN}` };
}

async function requestJson(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${FIX_API_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...authHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, json, text };
}

const tools = [
  {
    name: 'fix_health',
    description: 'Checa saúde da API Fix Fogões (GET /health).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'fix_leads_pending',
    description: 'Lista leads pendentes (GET /api/leads/pending). Requer BOT_TOKEN.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'fix_leads_all',
    description: "Lista todos os leads com filtros (GET /api/leads). Use status='ativo' para excluir perdidos/cancelados/entregues. Requer BOT_TOKEN.",
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: ['string', 'null'], default: null },
        score_min: { type: ['number', 'null'], default: null },
        score_max: { type: ['number', 'null'], default: null },
        limit: { type: ['number', 'null'], default: 20 },
        page: { type: ['number', 'null'], default: 0 },
        order_by: { type: ['string', 'null'], default: 'created_at' },
        order: { type: ['string', 'null'], default: 'desc' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'fix_lead_get',
    description: 'Busca um lead específico (GET /api/leads/:id). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID do lead' },
      },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'fix_lead_by_phone',
    description: 'Busca leads por telefone (GET /api/leads/by-phone/:phone). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Telefone (ex: 48999999999 ou 5548999999999)' },
      },
      required: ['phone'],
      additionalProperties: false,
    },
  },
  {
    name: 'fix_lead_update_status',
    description: 'Atualiza status CRM e adiciona nota opcional (PUT /api/leads/:id/status). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID do lead' },
        crm_status: { type: 'string', description: 'Novo status CRM' },
        notes: { type: ['string', 'null'], default: null },
        crm_score: { type: ['number', 'null'], default: null },
      },
      required: ['id', 'crm_status'],
      additionalProperties: false,
    },
  },
  {
    name: 'fix_lead_add_note',
    description: 'Adiciona uma nota no lead (POST /api/leads/:id/notes). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID do lead' },
        note: { type: 'string' },
        author: { type: ['string', 'null'], default: null },
      },
      required: ['id', 'note'],
      additionalProperties: false,
    },
  },
  {
    name: 'fix_appointments_list',
    description: 'Lista agendamentos por período (GET /api/bot/tools/listAppointments). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        date_from: { type: ['string', 'null'], default: null, description: 'YYYY-MM-DD' },
        date_to: { type: ['string', 'null'], default: null, description: 'YYYY-MM-DD' },
        status: { type: ['string', 'null'], default: null },
        limit: { type: ['number', 'null'], default: null },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'fix_crm_metrics',
    description: 'Retorna métricas do CRM (GET /api/analytics/crm). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        period_days: { type: ['number', 'null'], default: 30 },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'fix_get_availability',
    description: 'Consulta slots disponíveis (POST /api/bot/tools/getAvailability). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Data YYYY-MM-DD' },
        region: { type: ['string', 'null'], default: null },
        service_type: { type: ['string', 'null'], default: null },
        duration: { type: 'number', default: 60 },
      },
      required: ['date'],
      additionalProperties: false,
    },
  },
  {
    name: 'fix_create_appointment',
    description: 'Cria agendamento (POST /api/bot/tools/createAppointment). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: { type: 'string' },
        phone: { type: ['string', 'null'], default: null },
        start_time: { type: 'string', description: 'ISO 8601' },
        end_time: { type: 'string', description: 'ISO 8601' },
        address: { type: 'string', default: '' },
        address_complement: { type: 'string', default: '' },
        zip_code: { type: 'string', default: '' },
        email: { type: 'string', default: '' },
        cpf: { type: 'string', default: '' },
        description: { type: 'string', default: '' },
        equipment_type: { type: ['string', 'null'], default: null },
        attendance_preference: { type: 'string', default: '' },
        region: { type: ['string', 'null'], default: null },
      },
      required: ['client_name', 'start_time', 'end_time'],
      additionalProperties: false,
    },
  },
  {
    name: 'fix_cancel_appointment',
    description: 'Cancela agendamento (POST /api/bot/tools/cancelAppointment). Requer BOT_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        event_id: { type: 'string', description: 'ID do evento no calendário (UUID)' },
        reason: { type: 'string', default: '' },
      },
      required: ['event_id'],
      additionalProperties: false,
    },
  },
];

const server = new Server(
  { name: 'fixfogoes-mcp', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  const toQueryString = (obj) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(obj || {})) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  };

  try {
    if (name === 'fix_health') {
      const r = await requestJson('/health');
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? r.text, null, 2) }] };
    }

    if (name === 'fix_leads_pending') {
      const r = await requestJson('/api/leads/pending');
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_leads_all') {
      const q = toQueryString(args || {});
      const r = await requestJson(`/api/leads${q}`);
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_lead_get') {
      const id = args?.id;
      const r = await requestJson(`/api/leads/${encodeURIComponent(String(id))}`);
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_lead_by_phone') {
      const phone = args?.phone;
      const r = await requestJson(`/api/leads/by-phone/${encodeURIComponent(String(phone))}`);
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_lead_update_status') {
      const id = args?.id;
      const body = { ...args };
      delete body.id;
      const r = await requestJson(`/api/leads/${encodeURIComponent(String(id))}/status`, { method: 'PUT', body });
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_lead_add_note') {
      const id = args?.id;
      const body = { note: args?.note, author: args?.author };
      const r = await requestJson(`/api/leads/${encodeURIComponent(String(id))}/notes`, { method: 'POST', body });
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_appointments_list') {
      const q = toQueryString(args || {});
      const r = await requestJson(`/api/bot/tools/listAppointments${q}`);
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_crm_metrics') {
      const q = toQueryString(args || {});
      const r = await requestJson(`/api/analytics/crm${q}`);
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_get_availability') {
      const r = await requestJson('/api/bot/tools/getAvailability', { method: 'POST', body: args || {} });
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_create_appointment') {
      const r = await requestJson('/api/bot/tools/createAppointment', { method: 'POST', body: args || {} });
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    if (name === 'fix_cancel_appointment') {
      const r = await requestJson('/api/bot/tools/cancelAppointment', { method: 'POST', body: args || {} });
      return { content: [{ type: 'text', text: JSON.stringify(r.json ?? { status: r.status, body: r.text }, null, 2) }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'unknown_tool' }, null, 2) }] };
  } catch (e) {
    return { content: [{ type: 'text', text: JSON.stringify({ ok: false, error: 'tool_failed', message: String(e?.message || e) }, null, 2) }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
