# whatsapp-mcp-ts → Fix Fogões: trechos para validação

Este arquivo reúne, em um único lugar, os trechos completos solicitados (para copiar/colar na conversa).

---

## 1) src/mcp.ts (env/defaults + buildFixApiUrl + onde sobe o server)

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { jidNormalizedUser } from "@whiskeysockets/baileys";

import {
  type Message as DbMessage,
  type Chat as DbChat,
  getMessages,
  getChats,
  getChat,
  getMessagesAround,
  searchDbForContacts,
  searchMessages,
} from "./database.ts";

import { sendWhatsAppMessage, type WhatsAppSocket } from "./whatsapp.ts";
import { type P } from "pino";

const FIX_API_BASE =
  process.env.FIX_API_BASE || "https://api.fixfogoes.com.br";
const FIX_BOT_TOKEN = process.env.FIX_BOT_TOKEN || "";

function buildFixApiUrl(path: string): string {
  const base = FIX_API_BASE.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function inferUrgencyFromMessage(
  rawMessage: string,
  problem?: string | null,
): "high" | "medium" {
  const text = `${rawMessage} ${problem ?? ""}`.toLowerCase();
  const highKeywords = [
    "urgente",
    "emerg",
    "emergency",
    "hoje",
    "agora",
    "imediat",
  ];

  if (highKeywords.some((kw) => text.includes(kw))) {
    return "high";
  }

  return "medium";
}

export async function startMcpServer(
  sock: WhatsAppSocket | null,
  mcpLogger: P.Logger,
  waLogger: P.Logger,
): Promise<void> {
  mcpLogger.info("Initializing MCP server...");

  if (!process.env.FIX_API_BASE) {
    mcpLogger.warn(
      "FIX_API_BASE is not set; using default https://api.fixfogoes.com.br.",
    );
  } else {
    mcpLogger.info(`Using FIX_API_BASE from environment: ${FIX_API_BASE}`);
  }

  if (!FIX_BOT_TOKEN) {
    mcpLogger.warn(
      "FIX_BOT_TOKEN is not set; scheduling tools (get_availability, create_appointment) will return errors until it is configured.",
    );
  }

  const server = new McpServer({
    name: "whatsapp-baileys-ts",
    version: "0.1.0",
    capabilities: {
      tools: {},
      resources: {},
    },
  });

  // ... outras tools aqui ...
```

---

## 1b) src/mcp.ts (as 3 tools completas)

### Tool: register_whatsapp_lead

```ts
  server.tool(
    "register_whatsapp_lead",
    {
      phone: z
        .string()
        .min(1)
        .describe(
          "Telefone do cliente em formato internacional ou nacional. Ex: 5548999999999 ou 48999999999.",
        ),
      raw_message: z
        .string()
        .min(1)
        .describe("Mensagem original completa enviada pelo cliente no WhatsApp."),
      equipment: z
        .string()
        .optional()
        .nullable()
        .describe(
          "Tipo de equipamento identificado na mensagem. Ex: 'microondas', 'fogão', 'geladeira'.",
        ),
      problem: z
        .string()
        .optional()
        .nullable()
        .describe(
          "Descrição breve do problema detectado. Ex: 'não aquece', 'faz barulho', 'não liga'.",
        ),
      name: z
        .string()
        .optional()
        .nullable()
        .describe("Nome do cliente, se mencionado ou conhecido."),
      address: z
        .string()
        .optional()
        .nullable()
        .describe("Endereço do cliente, se mencionado ou conhecido."),
    },
    async ({ phone, raw_message, equipment, problem, name, address }) => {
      mcpLogger.info(
        `[MCP Tool] Executing register_whatsapp_lead for phone ${phone}`,
      );

      const urgency = inferUrgencyFromMessage(raw_message, problem ?? undefined);

      const payload = {
        phone,
        message: raw_message,
        extracted_data: {
          equipment_type: equipment ?? undefined,
          problem: problem ?? undefined,
          urgency,
          customer_name: name ?? undefined,
          address: address ?? undefined,
        },
      };

      try {
        const response = await fetch(
          buildFixApiUrl("/api/leads/from-claude"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          const message =
            errorText ||
            `Fix Fogões API responded with status ${response.status}`;

          mcpLogger.error(
            `[MCP Tool Error] register_whatsapp_lead HTTP ${response.status}: ${message}`,
          );
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error calling Fix Fogões lead API: ${message}`,
              },
            ],
          };
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        mcpLogger.error(
          `[MCP Tool Error] register_whatsapp_lead failed: ${error.message}`,
          error,
        );
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error calling Fix Fogões lead API: ${error.message}`,
            },
          ],
        };
      }
    },
  );
```

### Tool: get_availability

```ts
  server.tool(
    "get_availability",
    {
      date: z
        .string()
        .describe("Data no formato YYYY-MM-DD (ex: 2024-09-30)."),
      duration: z
        .number()
        .int()
        .min(30)
        .max(480)
        .optional()
        .default(60)
        .describe("Duração desejada em minutos (padrão 60)."),
      region: z
        .string()
        .optional()
        .nullable()
        .describe(
          "Região/bairro, se útil para regras internas de logística.",
        ),
    },
    async ({ date, duration, region }) => {
      mcpLogger.info(
        `[MCP Tool] Executing get_availability for date ${date}, duration=${duration}, region=${region}`,
      );

      if (!FIX_BOT_TOKEN) {
        const msg =
          "Environment variable FIX_BOT_TOKEN is not set; cannot call Fix Fogões scheduling API.";
        mcpLogger.error(`[MCP Tool Error] get_availability: ${msg}`);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: msg,
            },
          ],
        };
      }

      const payload = {
        date,
        duration,
        region: region ?? undefined,
      };

      try {
        const response = await fetch(
          buildFixApiUrl("/api/bot/tools/getAvailability"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${FIX_BOT_TOKEN}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          const message =
            errorText ||
            `Fix Fogões API responded with status ${response.status}`;

          mcpLogger.error(
            `[MCP Tool Error] get_availability HTTP ${response.status}: ${message}`,
          );
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error calling Fix Fogões getAvailability API: ${message}`,
              },
            ],
          };
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        mcpLogger.error(
          `[MCP Tool Error] get_availability failed: ${error.message}`,
          error,
        );
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error calling Fix Fogões getAvailability API: ${error.message}`,
            },
          ],
        };
      }
    },
  );
```

### Tool: create_appointment

```ts
  server.tool(
    "create_appointment",
    {
      client_name: z
        .string()
        .min(1)
        .describe("Nome do cliente."),
      phone: z
        .string()
        .min(1)
        .describe("Telefone do cliente, usado para contato/identificação."),
      start_time: z
        .string()
        .min(1)
        .describe(
          "Data/hora de início em ISO (ex: 2024-09-30T14:00:00-03:00).",
        ),
      end_time: z
        .string()
        .min(1)
        .describe(
          "Data/hora de fim em ISO, coerente com a duração escolhida.",
        ),
      address: z
        .string()
        .optional()
        .nullable()
        .describe("Endereço completo do cliente."),
      description: z
        .string()
        .optional()
        .nullable()
        .describe(
          "Descrição do problema/equipamento, para a ordem de serviço.",
        ),
      equipment_type: z
        .string()
        .optional()
        .nullable()
        .describe("Tipo do equipamento (microondas, fogão, geladeira...)."),
      email: z
        .string()
        .optional()
        .nullable()
        .describe("E-mail do cliente, se disponível."),
      cpf: z
        .string()
        .optional()
        .nullable()
        .describe("CPF/CNPJ do cliente, se disponível."),
      region: z
        .string()
        .optional()
        .nullable()
        .describe("Região/bairro (usado para regras de logística internas)."),
    },
    async ({
      client_name,
      phone,
      start_time,
      end_time,
      address,
      description,
      equipment_type,
      email,
      cpf,
      region,
    }) => {
      mcpLogger.info(
        `[MCP Tool] Executing create_appointment for client ${client_name}, phone ${phone}`,
      );

      if (!FIX_BOT_TOKEN) {
        const msg =
          "Environment variable FIX_BOT_TOKEN is not set; cannot call Fix Fogões scheduling API.";
        mcpLogger.error(`[MCP Tool Error] create_appointment: ${msg}`);
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: msg,
            },
          ],
        };
      }

      const payload = {
        client_name,
        phone,
        start_time,
        end_time,
        address: address ?? undefined,
        description: description ?? undefined,
        equipment_type: equipment_type ?? undefined,
        email: email ?? undefined,
        cpf: cpf ?? undefined,
        region: region ?? undefined,
      };

      try {
        const response = await fetch(
          buildFixApiUrl("/api/bot/tools/createAppointment"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${FIX_BOT_TOKEN}`,
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          const message =
            errorText ||
            `Fix Fogões API responded with status ${response.status}`;

          mcpLogger.error(
            `[MCP Tool Error] create_appointment HTTP ${response.status}: ${message}`,
          );
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error calling Fix Fogões createAppointment API: ${message}`,
              },
            ],
          };
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        mcpLogger.error(
          `[MCP Tool Error] create_appointment failed: ${error.message}`,
          error,
        );
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error calling Fix Fogões createAppointment API: ${error.message}`,
            },
          ],
        };
      }
    },
  );
```

---

## 2) scripts/test-fix-tools.mjs (inteiro)

```js
// Simple manual test script for Fix Fogões tools HTTP flow
// Runs outside MCP but uses the same FIX_API_BASE/FIX_BOT_TOKEN and payloads

const FIX_API_BASE = process.env.FIX_API_BASE || "https://api.fixfogoes.com.br";
const FIX_BOT_TOKEN = process.env.FIX_BOT_TOKEN || "";

function buildFixApiUrl(path) {
  const base = FIX_API_BASE.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function testGetAvailability() {
  const payload = {
    date: "2026-02-11",
    duration: 60,
    region: "Centro",
  };

  console.log("[test-fix-tools] Calling getAvailability with payload:");
  console.log(JSON.stringify(payload, null, 2));

  const response = await fetch(buildFixApiUrl("/api/bot/tools/getAvailability"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${FIX_BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("[test-fix-tools] getAvailability status:", response.status);
  console.log("[test-fix-tools] getAvailability response body:");
  console.log(text);
}

async function testCreateAppointment() {
  const payload = {
    client_name: "Teste MCP Fix Fogões",
    phone: "48999999999",
    start_time: "2026-02-11T14:00:00-03:00",
    end_time: "2026-02-11T15:00:00-03:00",
    address: "Endereço de teste, 123",
    description: "Agendamento de teste via script test-fix-tools.mjs",
    equipment_type: "microondas",
    region: "Centro",
  };

  console.log("[test-fix-tools] Calling createAppointment with payload:");
  console.log(JSON.stringify(payload, null, 2));

  const response = await fetch(buildFixApiUrl("/api/bot/tools/createAppointment"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${FIX_BOT_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  console.log("[test-fix-tools] createAppointment status:", response.status);
  console.log("[test-fix-tools] createAppointment response body:");
  console.log(text);
}

async function main() {
  console.log("[test-fix-tools] FIX_API_BASE:", FIX_API_BASE);
  if (!FIX_BOT_TOKEN) {
    console.error(
      "[test-fix-tools] ERROR: FIX_BOT_TOKEN is not set. Set it to your BOT_TOKEN before running this script.",
    );
    process.exit(1);
  }

  try {
    await testGetAvailability();
    await testCreateAppointment();
  } catch (err) {
    console.error("[test-fix-tools] Unexpected error while calling Fix API:");
    console.error(err);
    process.exit(1);
  }
}

// .mjs roda como ESM; top-level await funciona em Node moderno
await main();
```

---

## 3) package.json (apenas o scripts)

```json
"scripts": {
  "test:fix-tools": "node scripts/test-fix-tools.mjs"
},
```

---

## 4) Exemplo de .env (opcional)

```env
FIX_API_BASE=https://api.fixfogoes.com.br
FIX_BOT_TOKEN=SEU_BOT_TOKEN_AQUI
```

---

## 5) Confirmação do header de autenticação nas tools de agenda

As tools de agenda (get_availability e create_appointment) enviam:

- Header: `Authorization: Bearer ${FIX_BOT_TOKEN}`

E NÃO enviam `x-bot-token` no MCP atualmente.
