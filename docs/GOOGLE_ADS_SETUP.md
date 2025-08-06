# 🎯 Guia Completo: Configuração Google Ads API

## 📋 **PASSO 1: OBTER CREDENCIAIS OAUTH**

### **A. Google Cloud Console:**
1. Acesse: https://console.cloud.google.com/
2. Crie um novo projeto ou selecione existente
3. Vá para **APIs & Services** → **Library**
4. Ative a **Google Ads API**
5. Vá para **APIs & Services** → **Credentials**
6. Clique **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
7. Configure:
   - Application type: **Web application**
   - Name: **Fix Fogões Google Ads**
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
8. Anote: **Client ID** e **Client Secret**

### **B. Google Ads Console:**
1. Acesse: https://ads.google.com/
2. Vá para **Tools & Settings** → **Setup** → **API Center**
3. Clique **+ CREATE** para gerar **Developer Token**
4. Anote o **Customer ID** (formato: 123-456-7890)

## 📋 **PASSO 2: GERAR REFRESH TOKEN**

### **A. OAuth Playground:**
1. Acesse: https://developers.google.com/oauthplayground
2. No lado esquerdo, encontre **Google Ads API v16**
3. Selecione: `https://www.googleapis.com/auth/adwords`
4. Clique **Authorize APIs**
5. Faça login com conta que tem acesso ao Google Ads
6. Clique **Exchange authorization code for tokens**
7. Anote o **Refresh Token**

## 📋 **PASSO 3: CRIAR AÇÕES DE CONVERSÃO**

### **A. No Google Ads:**
1. Vá para **Tools & Settings** → **Conversions**
2. Clique **+ NEW CONVERSION ACTION**
3. Selecione **Import** → **Other data sources** → **Track conversions from clicks**

### **B. Criar estas conversões:**

```yaml
1. Lead Gerado:
   - Name: "Lead_Gerado"
   - Category: "Lead"
   - Value: "Don't use a value"
   - Count: "One"
   - Conversion window: "30 days"

2. Agendamento:
   - Name: "Agendamento"
   - Category: "Lead"
   - Value: "Use different values"
   - Count: "One"
   - Conversion window: "30 days"

3. Serviço Concluído:
   - Name: "Servico_Concluido"
   - Category: "Purchase"
   - Value: "Use different values"
   - Count: "One"
   - Conversion window: "90 days"

4. Fogão 4 Bocas:
   - Name: "Fogao_4_Bocas_Concluido"
   - Category: "Purchase"
   - Value: "Use different values"
   - Count: "One"
   - Conversion window: "90 days"

5. Fogão 6 Bocas:
   - Name: "Fogao_6_Bocas_Concluido"
   - Category: "Purchase"
   - Value: "Use different values"
   - Count: "One"
   - Conversion window: "90 days"

6. Cooktop:
   - Name: "Cooktop_Concluido"
   - Category: "Purchase"
   - Value: "Use different values"
   - Count: "One"
   - Conversion window: "90 days"

7. Forno:
   - Name: "Forno_Concluido"
   - Category: "Purchase"
   - Value: "Use different values"
   - Count: "One"
   - Conversion window: "90 days"
```

### **C. Obter IDs das Conversões:**
1. Após criar cada conversão, anote o **Conversion Action ID**
2. Formato: `customers/1234567890/conversionActions/987654321`
3. Use apenas a parte numérica: `987654321`

## 📋 **PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE**

### **A. Arquivo .env:**
```bash
# Google Ads API Configuration
GOOGLE_ADS_CUSTOMER_ID=123-456-7890
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token_aqui
GOOGLE_ADS_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret_aqui
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token_aqui

# Conversion Action IDs
GOOGLE_ADS_LEAD_CONVERSION_ID=123456789
GOOGLE_ADS_SCHEDULING_CONVERSION_ID=123456790
GOOGLE_ADS_COMPLETION_CONVERSION_ID=123456791
GOOGLE_ADS_STOVE_4_CONVERSION_ID=123456792
GOOGLE_ADS_STOVE_6_CONVERSION_ID=123456793
GOOGLE_ADS_COOKTOP_CONVERSION_ID=123456794
GOOGLE_ADS_OVEN_CONVERSION_ID=123456795
```

## 📋 **PASSO 5: TESTAR CONFIGURAÇÃO**

### **A. No Sistema:**
1. Vá para **Dashboard** → **Analytics** → **Conversões Google Ads**
2. Clique **Testar Conexão**
3. Deve aparecer: ✅ "Conexão com Google Ads API estabelecida!"

### **B. Teste Manual:**
1. Acesse uma URL com GCLID: `http://localhost:8083/?gclid=test123`
2. Crie um agendamento
3. Conclua o serviço
4. Vá para **Analytics** → **Relatório Detalhado**
5. Verifique se as conversões aparecem

## 📋 **PASSO 6: ATIVAÇÃO AUTOMÁTICA**

### **A. Upload Automático:**
1. No sistema, vá para **Analytics** → **Conversões Google Ads**
2. Configure período desejado
3. Clique **Envio Automático**
4. Conversões serão enviadas automaticamente

### **B. Verificação no Google Ads:**
1. Vá para **Tools & Settings** → **Conversions**
2. Clique na conversão criada
3. Verifique se aparecem dados na aba **Recent activity**

## 🚨 **TROUBLESHOOTING**

### **Erro: "Invalid customer ID"**
- Verifique formato: 123-456-7890 (com hífens)
- Confirme que é o Customer ID correto

### **Erro: "Invalid developer token"**
- Token deve estar aprovado no Google Ads
- Aguarde até 24h para aprovação

### **Erro: "Invalid refresh token"**
- Regenere o refresh token no OAuth Playground
- Verifique se usou o scope correto

### **Erro: "Conversion action not found"**
- Verifique se os IDs das conversões estão corretos
- Formato deve ser apenas números

## ✅ **CHECKLIST FINAL**

- [ ] Google Cloud Project criado
- [ ] Google Ads API ativada
- [ ] OAuth credentials criadas
- [ ] Developer Token obtido
- [ ] Refresh Token gerado
- [ ] 7 ações de conversão criadas
- [ ] IDs das conversões anotados
- [ ] Variáveis de ambiente configuradas
- [ ] Teste de conexão realizado
- [ ] Primeiro upload testado
- [ ] Dados aparecendo no Google Ads

## 🎯 **RESULTADO ESPERADO**

Após completar todos os passos:
- ✅ Conversões enviadas automaticamente
- ✅ ROI real visível no Google Ads
- ✅ Otimização automática das campanhas
- ✅ Relatórios detalhados no sistema
