# fixfogoes-mcp

Servidor MCP (Model Context Protocol) **somente** para a API Fix Fogões (banco / agenda / leads).

## Variáveis de ambiente

- `FIX_API_BASE` (default: `https://api.fixfogoes.com.br`)
- `BOT_TOKEN` (obrigatório para endpoints protegidos)

## Rodar local

```bash
cd mcp/fixfogoes-mcp
npm install
node index.js
```

## Importante

Este MCP **não** expõe tools de WhatsApp. WhatsApp deve ficar em um MCP separado.
