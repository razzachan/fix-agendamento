import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

function getEnv(name, fallback = "") {
  const v = process.env[name];
  return (v == null || v === "") ? fallback : String(v);
}

const BASE_URL = getEnv("FIX_OPS_BASE_URL", "https://webhook-ai-docker-production.up.railway.app").replace(/\/$/, "");
const ADMIN_KEY = getEnv("FIX_OPS_ADMIN_KEY", getEnv("ADMIN_API_KEY", ""));

if (!ADMIN_KEY) {
  // Não derruba o server; mas deixa claro no tool output
  console.error("[fix-ops] Missing FIX_OPS_ADMIN_KEY (or ADMIN_API_KEY) env var.");
}

function toolText(obj) {
  return {
    content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }],
  };
}

async function callAdminMessages({ limit = 50, channel, peer, session_id, direction }) {
  const u = new URL(`${BASE_URL}/admin/messages`);
  if (limit != null) u.searchParams.set("limit", String(limit));
  if (channel) u.searchParams.set("channel", String(channel));
  if (peer) u.searchParams.set("peer", String(peer));
  if (session_id) u.searchParams.set("session_id", String(session_id));
  if (direction) u.searchParams.set("direction", String(direction));

  const res = await fetch(u.toString(), {
    method: "GET",
    headers: {
      "x-admin-key": ADMIN_KEY,
      "accept": "application/json",
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { ok: false, status: res.status, raw: text };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: data?.error || data, base_url: BASE_URL };
  }
  return data;
}

const tools = [
  {
    name: "fix_last_messages",
    description:
      "Busca as últimas mensagens registradas pelo bot (Supabase bot_messages), com filtro opcional por canal/peer/direction.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Quantidade (1-200). Padrão 50.", default: 50 },
        channel: { type: "string", description: "Canal (ex: whatsapp)." },
        peer: { type: "string", description: "Identificador do contato (ex: 5548...)." },
        session_id: { type: "string", description: "ID interno da sessão (opcional)." },
        direction: { type: "string", enum: ["in", "out"], description: "Filtra entrada/saída." },
      },
      required: [],
      additionalProperties: false,
    },
    handler: async (args) => {
      const out = await callAdminMessages(args || {});
      return toolText(out);
    },
  },
];

const server = new Server(
  { name: "fix-ops", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    return { content: [{ type: "text", text: `Tool \"${request.params.name}\" not found` }], isError: true };
  }

  try {
    return await tool.handler(request.params.arguments);
  } catch (e) {
    return { content: [{ type: "text", text: String(e?.message || e) }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
