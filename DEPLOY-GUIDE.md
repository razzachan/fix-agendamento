# 🚀 GUIA COMPLETO DE DEPLOY - FIX FOGÕES

## 📋 RESUMO DO PROCESSO

1. **🌐 Comprar domínio**
2. **🏠 Configurar hospedagem**
3. **📤 Upload dos arquivos**
4. **📱 Gerar APK**

---

## 🌐 PASSO 1: COMPRAR DOMÍNIO

### **Sugestões de domínios:**
- `fixfogoes.com.br`
- `fixfogoes.app`
- `assistenciafixfogoes.com.br`

### **Onde comprar:**
- **Registro.br** (domínios .com.br) - R$ 40/ano
- **Hostinger** - R$ 50/ano
- **GoDaddy** - R$ 60/ano

---

## 🏠 PASSO 2: HOSPEDAGEM COM HTTPS

### **OPÇÃO 1: VERCEL (RECOMENDADO - GRÁTIS)**
1. Acesse: https://vercel.com
2. Conecte com GitHub
3. Importe o repositório
4. Deploy automático com HTTPS

### **OPÇÃO 2: NETLIFY (GRÁTIS)**
1. Acesse: https://netlify.com
2. Arraste a pasta `dist/`
3. HTTPS automático

### **OPÇÃO 3: HOSPEDAGEM TRADICIONAL**
- **Hostinger** - R$ 15/mês
- **UOL Host** - R$ 20/mês
- **Locaweb** - R$ 25/mês

---

## 📤 PASSO 3: PREPARAR ARQUIVOS

### **No seu computador:**

```bash
# 1. Fazer build de produção
npm run build

# 2. Verificar arquivos
ls dist/

# 3. Upload para servidor
# (Copie todo conteúdo da pasta dist/)
```

### **Estrutura que deve ficar no servidor:**
```
seudominio.com.br/
├── index.html
├── manifest.json
├── sw.js
├── assets/
│   ├── index-xxx.js
│   ├── index-xxx.css
│   └── icons/
└── screenshots/
```

---

## 📱 PASSO 4: GERAR APK

### **Depois que o site estiver no ar:**

1. **Acesse:** https://www.pwabuilder.com
2. **Cole a URL:** `https://seudominio.com.br`
3. **Clique:** "Start"
4. **Escolha:** "Android Package"
5. **Download:** APK pronto!

---

## 🔧 CONFIGURAÇÕES IMPORTANTES

### **Atualizar URLs no código:**

1. **Arquivo `.env.production`:**
```env
VITE_API_URL=https://seudominio.com.br/api
```

2. **Arquivo `manifest.json`:**
```json
{
  "start_url": "https://seudominio.com.br/",
  "scope": "https://seudominio.com.br/"
}
```

### **🎨 LOGOTIPO PARA APK:**

**Arquivo disponível:** `fix fogoes.png` (na pasta raiz e public/)

**Para usar no PWA2APK:**
- O serviço detecta automaticamente o ícone do manifest
- Se precisar personalizar, use o arquivo `fix fogoes.png`

**Para usar no PWA Builder:**
- Faça upload do `fix fogoes.png` quando solicitado
- Recomendado: 512x512px para melhor qualidade

---

## ✅ CHECKLIST FINAL

- [ ] Domínio comprado
- [ ] Hospedagem configurada
- [ ] HTTPS ativo
- [ ] Arquivos enviados
- [ ] Site funcionando
- [ ] PWA instalável
- [ ] APK gerado

---

## 🆘 SUPORTE

Se precisar de ajuda:
1. Verifique se HTTPS está ativo
2. Teste PWA no celular
3. Use PWA Builder para APK
4. Entre em contato se houver problemas

**Custo total estimado:** R$ 40-100 (domínio) + R$ 0-25/mês (hospedagem)
