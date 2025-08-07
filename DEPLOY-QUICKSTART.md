# 🚀 DEPLOY QUICKSTART - app.fixfogoes.com.br

## ⚡ **CONFIGURAÇÃO RÁPIDA (5 MINUTOS)**

### **1. Execute a configuração automática:**
```bash
npm run deploy:setup
```
*Responda as perguntas e tudo será configurado automaticamente!*

### **2. Configure o Cron Job no cPanel:**
1. Acesse o **cPanel** da HostGator
2. Procure por **"Trabalho Cron"** ou **"Cron Jobs"**
3. Clique em **"Adicionar novo trabalho cron"**
4. Configure:
   - **Frequência:** `*/15 * * * *` (a cada 15 minutos)
   - **Comando:** *(copie do arquivo `CRON-CONFIG.txt` criado)*

### **3. Teste o deploy:**
```bash
npm run deploy:test
```

### **4. Pronto! 🎉**
- Faça commit e push normalmente
- Deploy automático em até 15 minutos
- Site: https://app.fixfogoes.com.br

---

## 🛠️ **COMANDOS PRINCIPAIS**

```bash
# Configuração inicial (execute uma vez)
npm run deploy:setup

# Deploy manual (imediato)
npm run deploy:hostgator

# Testar configurações
npm run deploy:test

# Build local
npm run build
```

---

## 🔧 **SOLUÇÃO DE PROBLEMAS**

### **Deploy não funciona:**
1. Execute: `npm run deploy:test`
2. Verifique credenciais no `.env`
3. Confirme Cron Job no cPanel

### **Site não atualiza:**
1. Limpe cache do navegador
2. Execute: `npm run deploy:hostgator`
3. Verifique logs no cPanel

### **Erro de FTP:**
1. Confirme credenciais FTP
2. Teste conexão no FileZilla
3. Execute novamente: `npm run deploy:setup`

---

## ✅ **CHECKLIST FINAL**

- [ ] Executou `npm run deploy:setup`
- [ ] Configurou Cron Job no cPanel
- [ ] Testou com `npm run deploy:test`
- [ ] Site acessível: https://app.fixfogoes.com.br
- [ ] Deploy automático funcionando

**Tudo pronto para produção!** 🚀
