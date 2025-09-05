# 🚀 Fix Fogões - Guia de Desenvolvimento Completo

## 📋 Visão Geral

O script `dev:all` inicia **todos os serviços** necessários para o desenvolvimento do Fix Fogões de uma só vez, cada um em sua porta específica.

## 🎯 Serviços e Portas

| Serviço | Porta | Descrição | Tecnologia |
|---------|-------|-----------|------------|
| **Frontend** | `8082` | Interface web principal | Vite + React + TypeScript |
| **API Backend** | `3001` | API REST principal | Express + Supabase |
| **WhatsApp AI** | `3100` | Bot WhatsApp com IA | Node.js + WhatsApp-Web.js |
| **Middleware** | `8000` | Middleware Python | FastAPI + Python |
| **Thermal Print** | `3002` | Serviço de impressão térmica | Node.js + ESC/POS |

## 🚀 Como Usar

### Comando Principal
```bash
npm run dev:all
```

### Comandos Alternativos
```bash
# Usando o script diretamente
node scripts/dev-all.cjs

# Versão legacy com concurrently
npm run dev:all:legacy
```

## 🔧 Pré-requisitos

### Software Necessário
- **Node.js** (v18+)
- **Python** (v3.8+)
- **NPM** ou **Yarn**

### Dependências Python
```bash
pip install -r requirements.txt
```

### Verificação Automática
O script verifica automaticamente:
- ✅ Node.js instalado
- ✅ NPM disponível  
- ✅ Python disponível
- ✅ Dependências instaladas

## 📦 Instalação Inicial

### Setup Completo (Primeira Vez)
```bash
# Instalar todas as dependências
npm run dev:setup

# Ou manualmente:
npm install
npm --prefix webhook-ai install
npm --prefix thermal-print-service install
pip install -r requirements.txt
```

## 🌐 URLs de Acesso

Após iniciar com `npm run dev:all`:

- **🌐 Frontend:** http://localhost:8082
- **🔧 API:** http://localhost:3001
- **🤖 WhatsApp AI:** http://localhost:3100
- **🐍 Middleware:** http://localhost:8000
- **🖨️ Thermal Print:** http://localhost:3002

## 🛠️ Comandos Individuais

Se precisar iniciar serviços separadamente:

```bash
# Frontend apenas
npm run dev:frontend

# API apenas  
npm run dev:api

# WhatsApp AI apenas
npm run dev:webhook

# Middleware Python apenas
npm run dev:middleware

# Thermal Print apenas
npm run dev:thermal
```

## 🔄 Gerenciamento de Portas

### Matar Processos nas Portas
```bash
npm run dev:kill-ports
```

### Portas Monitoradas
O script automaticamente mata processos nas portas:
- `8082` (Frontend)
- `3001` (API)
- `3100` (WhatsApp AI)
- `8000` (Middleware)
- `3002` (Thermal Print)
- `3000` (Porta extra de segurança)

## 📊 Logs e Monitoramento

### Formato dos Logs
```
[SERVIÇO] 📡 HH:MM:SS - Mensagem
[API] 📡 14:30:15 - Servidor API rodando na porta 3001
[WEB] 📡 14:30:16 - Local: http://localhost:8082
[WA] 📡 14:30:17 - Webhook AI listening on :3100
```

### Cores dos Serviços
- 🟢 **API**: Verde
- 🔵 **WEB**: Ciano  
- 🟣 **WA**: Magenta
- 🟡 **PY**: Amarelo
- 🔵 **THERMAL**: Azul

## ⚠️ Solução de Problemas

### Erro: "Porta já em uso"
```bash
# Matar processos manualmente
npm run dev:kill-ports

# Ou verificar processos específicos
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac
```

### Erro: "Python não encontrado"
```bash
# Windows
py --version

# Linux/Mac
python3 --version

# Instalar dependências Python
pip install fastapi uvicorn python-dotenv supabase
```

### Erro: "Dependências não instaladas"
```bash
# Reinstalar tudo
npm run dev:setup

# Ou limpar e reinstalar
rm -rf node_modules webhook-ai/node_modules thermal-print-service/node_modules
npm install
```

## 🔧 Configuração de Ambiente

### Variáveis Necessárias (.env)
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# OpenAI (para WhatsApp AI)
OPENAI_API_KEY=your_openai_key

# Portas (opcionais)
PORT=3001
WEBHOOK_PORT=3100
MIDDLEWARE_PORT=8000
THERMAL_PORT=3002
```

## 🚦 Status dos Serviços

### Verificar se Tudo Está Funcionando
- ✅ **Frontend**: Abrir http://localhost:8082
- ✅ **API**: GET http://localhost:3001/health
- ✅ **WhatsApp AI**: GET http://localhost:3100/health  
- ✅ **Middleware**: GET http://localhost:8000/docs
- ✅ **Thermal**: GET http://localhost:3002/api/status

## 🎯 Fluxo de Desenvolvimento

1. **Iniciar**: `npm run dev:all`
2. **Desenvolver**: Editar código (hot reload automático)
3. **Testar**: Usar as URLs de acesso
4. **Parar**: `Ctrl+C` (mata todos os processos)

## 📝 Notas Importantes

- ⚡ **Hot Reload**: Todos os serviços têm reload automático
- 🔄 **Auto Restart**: Nodemon reinicia automaticamente em mudanças
- 🛡️ **Cleanup**: Script mata processos automaticamente ao parar
- 📱 **Mobile**: Frontend acessível via rede local (0.0.0.0:8082)

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs no terminal
2. Testar comandos individuais
3. Verificar portas disponíveis
4. Reinstalar dependências
5. Verificar variáveis de ambiente

---

**🎉 Agora você tem um ambiente de desenvolvimento completo rodando com um único comando!**
