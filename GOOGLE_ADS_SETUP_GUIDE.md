# 🎯 Guia de Configuração Google Ads API

Este guia te ajudará a configurar completamente a integração com Google Ads API no sistema Fix Eletros.

## 📋 Status Atual

✅ **Conta Principal (ATIVA)**: 290-689-2366
✅ **Conta MCC Gerenciadora**: 208-960-7313
✅ **Developer Token**: Solicitado (aguardando aprovação)  
✅ **Estrutura do Sistema**: Configurada  
⏳ **Aprovação Pendente**: 3 dias úteis  

## 🚀 Configuração Atual do Sistema

### ✅ O que já está configurado:

1. **Variáveis de ambiente** no `.env`
2. **Serviços de API** em `src/services/googleAds/`
3. **Configurações centralizadas** em `src/config/googleAds.ts`
4. **Componente de diagnóstico** em `src/components/GoogleAdsConfig.tsx`
5. **Scripts de teste** para validação

### 🔄 O que precisa ser feito após aprovação:

## 📝 Passo a Passo Completo

### 1. ⚙️ Configurar Credenciais OAuth (AGORA)

Você já tem as credenciais do Google Cloud Console, agora precisa adicioná-las ao `.env`:

```bash
# Substitua pelos seus valores reais
GOOGLE_ADS_CLIENT_ID=seu_client_id_real_aqui
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret_real_aqui
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token_real_aqui
```

### 2. ⏳ Aguardar Aprovação (3 DIAS ÚTEIS)

Quando o Google aprovar, você receberá um email com o Developer Token. Então:

```bash
# Substitua PENDING_APPROVAL pelo token real
GOOGLE_ADS_DEVELOPER_TOKEN=seu_developer_token_aprovado
```

### 3. 🎯 Configurar Ações de Conversão

Após aprovação, acesse: https://ads.google.com/aw/conversions?ocid=2089607313

Crie estas ações de conversão:

| Nome | Tipo | Valor | Janela |
|------|------|-------|--------|
| Lead Gerado | Lead | R$ 50 | 30 dias |
| Agendamento | Conversão | R$ 100 | 30 dias |
| Serviço Concluído | Compra | R$ 200 | 90 dias |
| Fogão 4 Bocas | Compra | R$ 150 | 90 dias |
| Fogão 6 Bocas | Compra | R$ 200 | 90 dias |
| Cooktop | Compra | R$ 180 | 90 dias |
| Forno | Compra | R$ 160 | 90 dias |

Depois adicione os IDs no `.env`:

```bash
GOOGLE_ADS_LEAD_CONVERSION_ID=123456789
GOOGLE_ADS_SCHEDULING_CONVERSION_ID=123456790
GOOGLE_ADS_COMPLETION_CONVERSION_ID=123456791
GOOGLE_ADS_STOVE_4_CONVERSION_ID=123456792
GOOGLE_ADS_STOVE_6_CONVERSION_ID=123456793
GOOGLE_ADS_COOKTOP_CONVERSION_ID=123456794
GOOGLE_ADS_OVEN_CONVERSION_ID=123456795
```

## 🧪 Como Testar

### Teste Rápido (Agora):
```bash
node test-google-ads-config.js
```

### Teste Completo (Após aprovação):
```javascript
// No console do navegador ou componente React
import { GoogleAdsConfigService } from '@/services/googleAds/googleAdsConfigService';

// Executar diagnósticos completos
const results = await GoogleAdsConfigService.runDiagnostics();
console.log(results);

// Testar conexão
import { GoogleAdsApiService } from '@/services/googleAds/googleAdsApiService';
const connection = await GoogleAdsApiService.testConnection();
console.log(connection);
```

## 📊 Componente de Monitoramento

Adicione o componente de configuração em qualquer página admin:

```tsx
import { GoogleAdsConfig } from '@/components/GoogleAdsConfig';

function AdminPage() {
  return (
    <div>
      <h1>Configurações</h1>
      <GoogleAdsConfig />
    </div>
  );
}
```

## 🔗 Links Importantes

- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **OAuth Playground**: https://developers.google.com/oauthplayground/
- **Central de API**: https://ads.google.com/aw/apicenter?ocid=2089607313
- **Conversões**: https://ads.google.com/aw/conversions?ocid=2089607313
- **Documentação**: https://developers.google.com/google-ads/api/docs/get-started/introduction

## 🚨 Troubleshooting

### Erro: "DEVELOPER_TOKEN_NOT_APPROVED"
- **Causa**: Token ainda não foi aprovado
- **Solução**: Aguarde aprovação (3 dias úteis)

### Erro: "PERMISSION_DENIED"
- **Causa**: Credenciais incorretas ou expiradas
- **Solução**: Verifique CLIENT_ID, CLIENT_SECRET e REFRESH_TOKEN

### Erro: "CUSTOMER_NOT_FOUND"
- **Causa**: Customer ID incorreto
- **Solução**: Use 2089607313 (MCC) ou 2906892366 (conta original)

### Erro: "CONVERSION_ACTION_NOT_FOUND"
- **Causa**: IDs de conversão não configurados
- **Solução**: Crie ações de conversão e configure os IDs

## 📈 Funcionalidades Disponíveis

### ✅ Já Funcionando:
- ✅ Configuração centralizada
- ✅ Validação de credenciais
- ✅ Diagnósticos automáticos
- ✅ Interface de monitoramento
- ✅ Logs detalhados

### 🔄 Após Aprovação:
- 🎯 Envio automático de conversões
- 📊 Relatórios de performance
- 🔄 Sincronização em tempo real
- 📈 Analytics avançados
- ⚡ Otimização automática

## 🎉 Próximos Passos

1. **AGORA**: Configure suas credenciais reais no `.env`
2. **APÓS APROVAÇÃO**: Adicione o Developer Token
3. **CONFIGURAR**: Crie ações de conversão
4. **TESTAR**: Execute diagnósticos completos
5. **ATIVAR**: Inicie tracking automático

## 📞 Suporte

Se precisar de ajuda:
1. Execute `node test-google-ads-config.js` para diagnóstico
2. Verifique logs no console do navegador
3. Use o componente `GoogleAdsConfig` para monitoramento
4. Consulte a documentação oficial do Google

---

**🎯 MISSÃO: Transformar leads em conversões rastreáveis e otimizar campanhas automaticamente!**
