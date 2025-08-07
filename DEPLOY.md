# 🚀 Guia de Deploy - app.fixfogoes.com.br

## 📋 **Visão Geral**

Este projeto possui **3 métodos de deploy** para máxima flexibilidade:

1. **🤖 Deploy Automático (Cron Job)** - Recomendado para produção
2. **📱 Deploy Manual Local** - Para testes e deploys imediatos  
3. **🔄 GitHub Actions** - Backup e CI/CD

---

## 🤖 **1. Deploy Automático via Cron Job (RECOMENDADO)**

### **Configuração no cPanel:**

1. **Acesse o cPanel** da HostGator
2. **Procure por "Trabalho Cron"** ou "Cron Jobs"
3. **Configure a tarefa:**

```bash
# Frequência: A cada 15 minutos (ou conforme necessário)
# Comando:
cd /home/miragioc/public_html/app.fixfogoes.com.br && bash deploy-hostgator.sh
```

### **Configuração Detalhada:**
- **Minuto:** `*/15` (a cada 15 minutos)
- **Hora:** `*` (todas as horas)
- **Dia:** `*` (todos os dias)
- **Mês:** `*` (todos os meses)
- **Dia da semana:** `*` (todos os dias da semana)

### **O que faz:**
- ✅ Monitora mudanças no repositório GitHub
- ✅ Faz pull automático das atualizações
- ✅ Executa build automaticamente
- ✅ Cria backup antes de atualizar
- ✅ Restaura backup em caso de erro
- ✅ Envia notificações por email

---

## 📱 **2. Deploy Manual Local**

### **Configuração:**

1. **Configure as credenciais FTP no `.env`:**
```env
FTP_SERVER=ftp.fixfogoes.com.br
FTP_USERNAME=miragioc@fixfogoes.com.br
FTP_PASSWORD=sua_senha_ftp_aqui
```

2. **Execute o deploy:**
```bash
# Deploy completo (build + upload)
npm run deploy:hostgator

# Ou apenas upload (se já tiver build)
npm run deploy:manual
```

### **O que faz:**
- ✅ Faz build local do projeto
- ✅ Conecta via FTP ao servidor
- ✅ Cria backup do site atual
- ✅ Envia arquivos para app.fixfogoes.com.br
- ✅ Confirma sucesso do deploy

---

## 🔄 **3. GitHub Actions (Backup/CI)**

### **Configuração:**

1. **Configure os secrets no GitHub:**
   - Vá em: `Settings` → `Secrets and variables` → `Actions`
   - Adicione:
     ```
     VITE_SUPABASE_URL=sua_url_supabase
     VITE_SUPABASE_KEY=sua_chave_supabase
     FTP_SERVER=ftp.fixfogoes.com.br
     FTP_USERNAME=miragioc@fixfogoes.com.br
     FTP_PASSWORD=sua_senha_ftp
     ```

2. **Deploy automático:**
   - Todo push na branch `main` dispara o deploy
   - Ou execute manualmente em `Actions` → `Deploy to HostGator`

---

## 🛠️ **Comandos Disponíveis**

```bash
# Desenvolvimento
npm run dev                 # Servidor local
npm run build              # Build de produção

# Deploy
npm run deploy:hostgator   # Deploy completo (build + FTP)
npm run deploy:manual      # Apenas FTP (requer build)

# Utilitários
npm run build:clean        # Build limpo
npm run zip-dist          # Prepara ZIP manual
```

---

## 📊 **Monitoramento**

### **Logs do Cron Job:**
```bash
# Ver logs de deploy
tail -f /home/miragioc/logs/deploy.log

# Ver últimos deploys
ls -la /home/miragioc/backups/app-fixfogoes/
```

### **Verificação de Status:**
- **Site:** https://app.fixfogoes.com.br
- **Logs GitHub:** https://github.com/razzachan/fix-agendamento/actions
- **Status FTP:** Teste com `npm run deploy:manual`

---

## 🚨 **Solução de Problemas**

### **Deploy falhou:**
1. Verifique os logs: `/home/miragioc/logs/deploy.log`
2. Teste build local: `npm run build`
3. Verifique credenciais FTP no `.env`

### **Site não atualiza:**
1. Limpe cache do navegador
2. Verifique se o Cron Job está ativo
3. Execute deploy manual: `npm run deploy:hostgator`

### **Erro de permissões:**
```bash
# No servidor, ajuste permissões:
find /home/miragioc/public_html/app.fixfogoes.com.br -type f -exec chmod 644 {} \;
find /home/miragioc/public_html/app.fixfogoes.com.br -type d -exec chmod 755 {} \;
```

---

## ✅ **Checklist de Deploy**

- [ ] Código testado localmente
- [ ] Build funcionando: `npm run build`
- [ ] Credenciais FTP configuradas
- [ ] Cron Job ativo no cPanel
- [ ] Site acessível: https://app.fixfogoes.com.br
- [ ] Backup criado automaticamente

---

## 🎯 **Fluxo Recomendado**

1. **Desenvolvimento:** Trabalhe normalmente no VS Code
2. **Commit:** `git add . && git commit -m "feat: nova funcionalidade"`
3. **Push:** `git push origin main`
4. **Deploy Automático:** Cron Job detecta e faz deploy em até 15 minutos
5. **Verificação:** Acesse https://app.fixfogoes.com.br

**Para deploys urgentes:** Use `npm run deploy:hostgator` para deploy imediato!
