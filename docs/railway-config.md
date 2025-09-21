# Railway Configuration - Fix Fogões

## Serviços a criar:

### 1. API Service
- **Root Path**: `/` (raiz do repositório)
- **Build Command**: `npm ci`
- **Start Command**: `node api/index.js`
- **Port**: Railway detecta automaticamente via process.env.PORT

### 2. Bot Service  
- **Root Path**: `/webhook-ai`
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Port**: Railway detecta automaticamente via process.env.PORT

## Environment Variables

### API Service:
```
ALLOWED_ORIGINS=https://www.app.fixfogoes.com.br,https://app.fixfogoes.com.br
SUPABASE_URL=https://hdyucwabemspehokoiks.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[VALOR_SECRETO]
NODE_ENV=production
```

### Bot Service:
```
NIXPACKS_PKGS=chromium
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_ARGS=--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage
PUPPETEER_SKIP_DOWNLOAD=true
WA_DATA_PATH=/data/whatsapp
WA_HEADLESS=true
SUPABASE_URL=https://hdyucwabemspehokoiks.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[VALOR_SECRETO]
OPENAI_API_KEY=[VALOR_SECRETO]
NODE_ENV=production
ADMIN_API_KEY=fix-admin-2024-secure
FIX_HANDOFF_ADMIN_ID=a1c05f82-f9fb-42b8-89ff-540046f61b80
FIX_HANDOFF_EMAIL=admin@fixfogoes.com.br
```

## Volume Configuration (Bot Service):
- **Mount Path**: `/data`
- **Size**: 1GB (suficiente para sessão WhatsApp)

## Post-Deploy Steps:
1. Acessar Bot URL + `/whatsapp/qr-image`
2. Escanear QR com WhatsApp da empresa
3. Testar endpoints de health
4. Configurar domínios customizados
