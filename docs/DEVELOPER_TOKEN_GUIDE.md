# 🔑 Guia Completo: Developer Token Google Ads API

## 🎯 Objetivo
Este guia detalha o processo para obter o **Developer Token** necessário para usar a Google Ads API em produção.

---

## 📋 Pré-requisitos

### ✅ **Já Configurado:**
- [x] Conta Google Ads ativa
- [x] Projeto Google Cloud criado
- [x] Google Ads API habilitada
- [x] Credenciais OAuth 2.0 configuradas
- [x] Customer ID identificado: `2089607313`

### ⚠️ **Necessário:**
- [ ] Developer Token aprovado pelo Google

---

## 🚀 Processo de Solicitação

### **Passo 1: Acessar Google Ads API Center**

1. **URL**: [https://ads.google.com/nav/selectaccount?authuser=0&dst=/aw/apicenter](https://ads.google.com/nav/selectaccount?authuser=0&dst=/aw/apicenter)
2. **Login**: `akroma.julio@gmail.com`
3. **Selecionar conta**: Fix Eletros (ID: 2089607313)

### **Passo 2: Solicitar Acesso**

1. **Clique em**: "Apply for access" ou "Solicitar acesso"
2. **Preencha o formulário** com as informações abaixo

### **Passo 3: Informações do Formulário**

```
📋 DADOS PARA PREENCHIMENTO:

Company/Organization Name:
Fix Eletros

Website URL:
https://fixeletros.com.br

Contact Email:
akroma.julio@gmail.com

Application Type:
Web Application

Primary Use Case:
Marketing automation and campaign management for electrical services

Detailed Description:
Sistema de agendamento de serviços elétricos com integração Google Ads 
para automação de campanhas, criação de anúncios baseados em agendamentos 
e otimização de performance de marketing digital.

Integration Method:
Server-to-server API integration

Expected API Usage:
- Campaign management
- Ad creation and optimization  
- Performance reporting
- Keyword management
- Automated bidding adjustments

Estimated Daily Requests:
< 1,000 requests per day

Will you be managing ads for other businesses?
No - Only for our own business (Fix Eletros)

Developer Experience:
Experienced with REST APIs and OAuth 2.0 authentication

Technical Contact:
Julio Betoni - akroma.julio@gmail.com
```

---

## ⏱️ Cronograma de Aprovação

### **Tipos de Token:**

#### 🧪 **Test/Development Token:**
- ⚡ **Aprovação**: Instantânea
- 🔒 **Limitações**: 
  - Apenas contas de teste
  - Funcionalidades limitadas
  - Não pode acessar dados reais

#### 🚀 **Production Token:**
- ⏱️ **Aprovação**: 1-7 dias úteis
- ✅ **Benefícios**:
  - Acesso completo à API
  - Todas as funcionalidades
  - Dados reais de campanhas

### **Processo de Revisão:**
1. **Submissão**: Formulário enviado
2. **Revisão Automática**: 1-2 horas
3. **Revisão Manual**: 1-7 dias (se necessário)
4. **Notificação**: Email com resultado

---

## 📧 Acompanhamento

### **Emails de Notificação:**
- ✅ **Aprovado**: "Your Google Ads API access has been approved"
- ❌ **Rejeitado**: "Your Google Ads API access request needs attention"
- ⏳ **Pendente**: "Your Google Ads API access request is under review"

### **Como Verificar Status:**
1. Acesse o [Google Ads API Center](https://ads.google.com/nav/selectaccount?authuser=0&dst=/aw/apicenter)
2. Verifique a seção "API Access Status"
3. O token aparecerá quando aprovado

---

## 🔧 Após Aprovação

### **1. Copiar o Developer Token:**
```
Formato: XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX
Exemplo: 12345678-90123456-78901234-56789012
```

### **2. Atualizar .env:**
```bash
# Substituir esta linha:
GOOGLE_ADS_DEVELOPER_TOKEN=PENDING_APPROVAL

# Por:
GOOGLE_ADS_DEVELOPER_TOKEN=SEU_TOKEN_REAL_AQUI
```

### **3. Testar a Integração:**
```javascript
// test/connection.js
const { GoogleAdsApi } = require('google-ads-api');

async function testConnection() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  });

  const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN
  });

  try {
    const campaigns = await customer.campaigns.list();
    console.log('✅ Conexão bem-sucedida!');
    console.log(`📊 Campanhas: ${campaigns.length}`);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testConnection();
```

---

## 🚨 Possíveis Problemas

### **Rejeição Comum:**
- **Motivo**: Informações insuficientes
- **Solução**: Fornecer mais detalhes sobre o uso

### **Demora na Aprovação:**
- **Motivo**: Revisão manual necessária
- **Solução**: Aguardar ou entrar em contato

### **Token Inválido:**
- **Motivo**: Token copiado incorretamente
- **Solução**: Verificar e copiar novamente

---

## 📞 Suporte

### **Google Ads API Support:**
- **Forum**: [Google Ads API Forum](https://groups.google.com/g/adwords-api)
- **Documentation**: [Developer Guide](https://developers.google.com/google-ads/api/docs/start)

### **Contato Interno:**
- **Desenvolvedor**: Julio Betoni
- **Email**: akroma.julio@gmail.com
- **Projeto**: Fix Eletros Integration

---

## ✅ Checklist Final

- [ ] Formulário preenchido e enviado
- [ ] Email de confirmação recebido
- [ ] Status verificado no API Center
- [ ] Token copiado (quando aprovado)
- [ ] Arquivo .env atualizado
- [ ] Teste de conexão executado
- [ ] Integração validada

**🎯 Meta: Obter aprovação em até 7 dias úteis**
