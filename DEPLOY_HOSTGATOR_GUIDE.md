# 🚀 GUIA DE DEPLOY - HOSTGATOR

## 📋 RESUMO
Este guia te ajudará a fazer o deploy das atualizações do Fix Fogões para a Hostgator.

---

## 📦 ARQUIVOS PREPARADOS

✅ **Build de produção gerado** em: `dist/`
✅ **Arquivo .htaccess** configurado para SPA
✅ **Página de verificação** criada: `deploy-check.html`

---

## 🔧 PASSO A PASSO PARA DEPLOY

### **1. ACESSAR PAINEL DA HOSTGATOR**

1. Acesse: [https://hostgator.com.br](https://hostgator.com.br)
2. Faça login no seu painel
3. Vá para **cPanel** ou **Gerenciador de Arquivos**

### **2. BACKUP DOS ARQUIVOS ATUAIS (IMPORTANTE!)**

⚠️ **SEMPRE FAÇA BACKUP ANTES DE ATUALIZAR**

1. No **Gerenciador de Arquivos**, vá para a pasta do domínio
2. Selecione todos os arquivos atuais
3. Clique em **Compactar** → **Criar Arquivo ZIP**
4. Nomeie como: `backup-fix-fogoes-YYYY-MM-DD.zip`
5. **Baixe o backup** para seu computador

### **3. LIMPAR ARQUIVOS ANTIGOS**

1. **Selecione todos os arquivos** na pasta do domínio
2. **EXCETO:**
   - `.htaccess` (se existir)
   - Pastas de email (se houver)
   - Outros arquivos importantes do servidor
3. **Delete os arquivos selecionados**

### **4. UPLOAD DOS NOVOS ARQUIVOS**

#### **Opção A: Via Gerenciador de Arquivos (Recomendado)**

1. No **Gerenciador de Arquivos**, clique em **Upload**
2. **Selecione TODOS os arquivos** da pasta `dist/`:
   ```
   📁 dist/
   ├── 📁 assets/          (todos os arquivos JS/CSS)
   ├── 📁 icons/           (ícones do PWA)
   ├── 📁 api/             (se existir)
   ├── 📁 markers/         (marcadores do mapa)
   ├── 📄 index.html       (arquivo principal)
   ├── 📄 .htaccess        (configuração Apache)
   ├── 📄 manifest.json    (PWA manifest)
   ├── 📄 sw.js           (service worker)
   ├── 📄 deploy-check.html (verificação)
   ├── 📄 favicon.ico      (ícone do site)
   └── 📄 robots.txt       (SEO)
   ```

3. **Aguarde o upload** de todos os arquivos
4. **Extraia** se necessário (alguns arquivos podem vir compactados)

#### **Opção B: Via FTP (Alternativa)**

1. Use um cliente FTP como **FileZilla**
2. Conecte com as credenciais da Hostgator
3. Navegue até a pasta do domínio
4. **Arraste todos os arquivos** da pasta `dist/` para o servidor

### **5. CONFIGURAR PERMISSÕES**

1. **Selecione todos os arquivos** enviados
2. Clique em **Permissões** ou **Chmod**
3. Configure:
   - **Arquivos:** `644` (rw-r--r--)
   - **Pastas:** `755` (rwxr-xr-x)
   - **Especial .htaccess:** `644`

### **6. VERIFICAR DEPLOY**

#### **Teste 1: Página de Verificação**
1. Acesse: `https://seudominio.com/deploy-check.html`
2. Deve mostrar: "✅ Deploy Realizado com Sucesso!"

#### **Teste 2: Sistema Principal**
1. Acesse: `https://seudominio.com`
2. Deve carregar o Fix Fogões normalmente
3. Teste o login com suas credenciais

#### **Teste 3: Funcionalidades Novas**
1. **Sistema de Comentários:**
   - Abra uma OS
   - Adicione um comentário
   - Verifique se aparece na lista

2. **Validação de Geolocalização:**
   - Como técnico, tente fazer check-in
   - Deve abrir dialog de validação de localização

3. **Ferramentas de Admin:**
   - No dashboard admin
   - Procure por "Gerenciamento do Sistema"
   - Execute os testes automatizados

---

## 🔧 CONFIGURAÇÕES ADICIONAIS

### **SSL/HTTPS (Se não estiver configurado)**

1. No **cPanel**, vá para **SSL/TLS**
2. Ative **Let's Encrypt** (gratuito)
3. Configure **Force HTTPS Redirect**

### **Configuração de Domínio**

Se estiver usando `app.fixfogoes.com.br`:
1. Verifique se o **DNS** está apontando corretamente
2. Configure o **subdomain** no cPanel se necessário

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### **Problema: Página em branco**
**Solução:**
1. Verifique se `index.html` está na raiz
2. Verifique permissões dos arquivos
3. Veja logs de erro no cPanel

### **Problema: Rotas não funcionam**
**Solução:**
1. Verifique se `.htaccess` foi enviado
2. Confirme que mod_rewrite está ativo
3. Teste acessando `/deploy-check.html`

### **Problema: Assets não carregam**
**Solução:**
1. Verifique se pasta `assets/` foi enviada
2. Confirme permissões da pasta
3. Teste acessando um arquivo CSS diretamente

### **Problema: PWA não funciona**
**Solução:**
1. Verifique se `manifest.json` e `sw.js` estão na raiz
2. Confirme que HTTPS está ativo
3. Limpe cache do navegador

---

## ✅ CHECKLIST FINAL

Após o deploy, verifique:

- [ ] ✅ Site carrega normalmente
- [ ] ✅ Login funciona
- [ ] ✅ Dashboards carregam
- [ ] ✅ Sistema de comentários funciona
- [ ] ✅ Validação de geolocalização ativa
- [ ] ✅ Notificações funcionando
- [ ] ✅ PWA instalável
- [ ] ✅ Responsivo no mobile
- [ ] ✅ HTTPS ativo
- [ ] ✅ Performance boa (< 3s)

---

## 📞 SUPORTE

### **Se algo der errado:**

1. **Restaure o backup:**
   - Delete arquivos novos
   - Extraia o backup feito no passo 2

2. **Verifique logs:**
   - cPanel → Logs de Erro
   - Console do navegador (F12)

3. **Contate suporte:**
   - Hostgator: suporte técnico
   - Desenvolvedor: disponível para ajuda

---

## 🎉 SUCESSO!

Se todos os testes passaram, **PARABÉNS!** 

O Fix Fogões foi atualizado com sucesso com:
- ✅ Sistema de comentários
- ✅ Validação de geolocalização
- ✅ Notificações inteligentes
- ✅ Ferramentas de administração
- ✅ Testes automatizados

**O sistema está pronto para uso em produção!** 🚀

---

*Guia criado em: 2025-01-20*  
*Versão: 1.0*
