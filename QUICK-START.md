# ⚡ Fix Fogões - Início Rápido

## 🚀 Comando Principal

```bash
npm run dev:all
```

**Isso inicia TODOS os serviços de uma vez!**

## 🎯 O que é iniciado?

| Serviço | Porta | URL |
|---------|-------|-----|
| 🌐 **Frontend** | 8082 | http://localhost:8082 |
| 🔧 **API** | 3001 | http://localhost:3001 |
| 🤖 **WhatsApp AI** | 3100 | http://localhost:3100 |
| 🐍 **Middleware** | 8000 | http://localhost:8000 |
| 🖨️ **Thermal Print** | 3002 | http://localhost:3002 |

## 🛠️ Comandos Úteis

```bash
# Iniciar tudo
npm run dev:all

# Verificar se está funcionando
npm run health:all

# Instalar dependências
npm run dev:setup

# Matar processos nas portas
npm run dev:kill-ports

# Iniciar serviços individuais
npm run dev:frontend    # Só o frontend
npm run dev:api         # Só a API
npm run dev:webhook     # Só o WhatsApp AI
npm run dev:middleware  # Só o middleware Python
npm run dev:thermal     # Só o thermal print
```

## 🚦 Scripts de Inicialização

### Windows
```cmd
start-dev-all.bat
```

### Linux/Mac
```bash
./start-dev-all.sh
```

## ⚠️ Primeira Vez?

1. **Instalar dependências:**
   ```bash
   npm run dev:setup
   ```

2. **Configurar .env:**
   - Copie `.env.example` para `.env`
   - Configure as variáveis do Supabase e OpenAI

3. **Iniciar:**
   ```bash
   npm run dev:all
   ```

## 🔧 Solução de Problemas

### Erro: "Porta já em uso"
```bash
npm run dev:kill-ports
```

### Erro: "Python não encontrado"
- Windows: Instale Python do python.org
- Linux: `sudo apt install python3`
- Mac: `brew install python3`

### Erro: "Dependências não instaladas"
```bash
npm run dev:setup
```

## 📊 Verificar Status

```bash
npm run health:all
```

Mostra o status de todos os serviços com cores:
- 🟢 Funcionando
- 🟡 Com avisos  
- 🔴 Com erro

## 🎉 Pronto!

Após `npm run dev:all`, você terá:
- ✅ Sistema completo rodando
- ✅ Hot reload em todos os serviços
- ✅ Logs coloridos por serviço
- ✅ URLs de acesso prontas

**Para parar tudo: `Ctrl+C`**
