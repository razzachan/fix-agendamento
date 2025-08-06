# 🔗 Exemplos de Integração Google Ads API

Este documento mostra como integrar o Google Ads API com o sistema existente do Fix Eletros.

## 🎯 Cenários de Uso

### 1. 📞 Capturar Lead do Formulário

```typescript
// Em src/components/ContactForm.tsx
import { GoogleAdsIntegration } from '@/examples/googleAdsUsage';

function ContactForm() {
  const handleSubmit = async (formData) => {
    // Salvar lead no banco
    const lead = await createLead(formData);
    
    // Capturar GCLID do URL
    const urlParams = new URLSearchParams(window.location.search);
    const gclid = urlParams.get('gclid');
    
    // Enviar conversão para Google Ads
    if (gclid) {
      await GoogleAdsIntegration.trackLeadGenerated(formData, gclid);
    }
    
    return lead;
  };
  
  // ... resto do componente
}
```

### 2. 📅 Rastrear Agendamento Confirmado

```typescript
// Em src/services/agendamentos/index.ts
import { GoogleAdsIntegration } from '@/examples/googleAdsUsage';

export async function confirmScheduling(orderData) {
  // Confirmar agendamento
  const confirmed = await updateOrderStatus(orderData.id, 'scheduled');
  
  // Buscar GCLID salvo no lead original
  const gclid = await getGclidFromOrder(orderData.id);
  
  // Rastrear conversão
  if (gclid && confirmed) {
    await GoogleAdsIntegration.trackSchedulingCompleted(orderData, gclid);
  }
  
  return confirmed;
}
```

### 3. ✅ Rastrear Serviço Concluído

```typescript
// Em src/services/serviceOrder/index.ts
import { GoogleAdsIntegration } from '@/examples/googleAdsUsage';

export async function completeService(orderId, completionData) {
  // Marcar serviço como concluído
  const completed = await updateOrderStatus(orderId, 'completed');
  
  if (completed) {
    // Buscar dados completos da ordem
    const orderData = await getOrderWithCustomer(orderId);
    const gclid = await getGclidFromOrder(orderId);
    
    // Rastrear conversão específica por tipo de equipamento
    if (gclid) {
      await GoogleAdsIntegration.trackServiceCompleted(orderData, gclid);
    }
  }
  
  return completed;
}
```

### 4. 🔄 Middleware para Capturar GCLID

```typescript
// Em middleware.py ou novo arquivo
export function captureGclid(req, res, next) {
  const gclid = req.query.gclid;
  
  if (gclid) {
    // Salvar GCLID na sessão
    req.session.gclid = gclid;
    
    // Ou salvar em cookie
    res.cookie('gclid', gclid, { 
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 dias
      httpOnly: true 
    });
  }
  
  next();
}
```

### 5. 📊 Dashboard de Monitoramento

```tsx
// Em src/pages/admin/GoogleAdsDashboard.tsx
import { GoogleAdsConfig } from '@/components/GoogleAdsConfig';
import { useGoogleAdsStatus } from '@/examples/googleAdsUsage';

function GoogleAdsDashboard() {
  const { status, loading, runDiagnostics, testConnection } = useGoogleAdsStatus();
  
  return (
    <div className="space-y-6">
      <h1>Google Ads Integration</h1>
      
      {/* Componente de configuração */}
      <GoogleAdsConfig />
      
      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <h3>Conversões Hoje</h3>
            <p className="text-2xl font-bold">12</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <h3>Valor Total</h3>
            <p className="text-2xl font-bold">R$ 2.400</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <h3>Taxa de Conversão</h3>
            <p className="text-2xl font-bold">8.5%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## 🗄️ Estrutura do Banco de Dados

### Tabela para Rastreamento de Conversões

```sql
-- Criar tabela para rastrear conversões
CREATE TABLE google_ads_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(50) NOT NULL,
  conversion_name VARCHAR(100) NOT NULL,
  conversion_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversion_value DECIMAL(10,2),
  conversion_currency VARCHAR(3) DEFAULT 'BRL',
  google_click_id VARCHAR(255),
  customer_info JSONB,
  exported BOOLEAN DEFAULT FALSE,
  exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_google_ads_conversions_order_id ON google_ads_conversions(order_id);
CREATE INDEX idx_google_ads_conversions_exported ON google_ads_conversions(exported);
CREATE INDEX idx_google_ads_conversions_gclid ON google_ads_conversions(google_click_id);
```

### Adicionar GCLID às tabelas existentes

```sql
-- Adicionar coluna GCLID às ordens de serviço
ALTER TABLE service_orders ADD COLUMN google_click_id VARCHAR(255);

-- Adicionar coluna GCLID aos leads
ALTER TABLE leads ADD COLUMN google_click_id VARCHAR(255);

-- Índices
CREATE INDEX idx_service_orders_gclid ON service_orders(google_click_id);
CREATE INDEX idx_leads_gclid ON leads(google_click_id);
```

## 🔧 Configuração do Sistema

### 1. Adicionar ao .env

```bash
# Google Ads API - SUBSTITUA PELOS VALORES REAIS
GOOGLE_ADS_CLIENT_ID=seu_client_id_real
GOOGLE_ADS_CLIENT_SECRET=seu_client_secret_real
GOOGLE_ADS_REFRESH_TOKEN=seu_refresh_token_real
GOOGLE_ADS_DEVELOPER_TOKEN=PENDING_APPROVAL
GOOGLE_ADS_CUSTOMER_ID=2089607313
GOOGLE_ADS_LOGIN_CUSTOMER_ID=2089607313

# IDs das Conversões (configurar após criar no Google Ads)
GOOGLE_ADS_LEAD_CONVERSION_ID=
GOOGLE_ADS_SCHEDULING_CONVERSION_ID=
GOOGLE_ADS_COMPLETION_CONVERSION_ID=
GOOGLE_ADS_STOVE_4_CONVERSION_ID=
GOOGLE_ADS_STOVE_6_CONVERSION_ID=
GOOGLE_ADS_COOKTOP_CONVERSION_ID=
GOOGLE_ADS_OVEN_CONVERSION_ID=

# Configurações de Vite
VITE_GOOGLE_ADS_CUSTOMER_ID=2089607313
VITE_GOOGLE_ADS_TRACKING_ENABLED=true
```

### 2. Adicionar Scripts ao package.json

```json
{
  "scripts": {
    "test:google-ads": "node test-google-ads-config.js",
    "google-ads:diagnose": "node -e \"require('./src/examples/googleAdsUsage').runFullDiagnostics()\"",
    "google-ads:demo": "node -e \"require('./src/examples/googleAdsUsage').demonstrateGoogleAdsIntegration()\""
  }
}
```

## 🚀 Implementação Gradual

### Fase 1: Configuração (AGORA)
- ✅ Configurar credenciais no .env
- ✅ Testar configuração básica
- ✅ Aguardar aprovação do Developer Token

### Fase 2: Tracking Básico (APÓS APROVAÇÃO)
- 🎯 Implementar captura de GCLID
- 🎯 Rastrear leads gerados
- 🎯 Testar envio de conversões

### Fase 3: Tracking Avançado
- 📅 Rastrear agendamentos
- ✅ Rastrear serviços concluídos
- 📊 Dashboard de monitoramento

### Fase 4: Otimização
- 🤖 Automação completa
- 📈 Relatórios avançados
- ⚡ Otimização de campanhas

## 🧪 Como Testar

### Teste de Configuração
```bash
npm run test:google-ads
```

### Teste de Integração
```javascript
// No console do navegador
import { demonstrateGoogleAdsIntegration } from '@/examples/googleAdsUsage';
await demonstrateGoogleAdsIntegration();
```

### Teste de Conversão Manual
```javascript
// Simular conversão
import { GoogleAdsIntegration } from '@/examples/googleAdsUsage';

await GoogleAdsIntegration.trackLeadGenerated({
  name: 'Teste',
  phone: '11999999999',
  email: 'teste@email.com'
}, 'gclid_teste_123');
```

## 📈 Métricas Esperadas

Após implementação completa:

- **Leads Rastreados**: 100% dos leads com GCLID
- **Agendamentos**: 80% de conversão de leads
- **Serviços Concluídos**: 90% de conclusão
- **ROI Melhorado**: 25-40% de melhoria
- **Otimização**: Automática baseada em dados

## 🎯 Próximos Passos

1. **Configure suas credenciais reais** no .env
2. **Aguarde aprovação** do Developer Token (3 dias)
3. **Crie ações de conversão** no Google Ads
4. **Implemente captura de GCLID** no frontend
5. **Teste com dados reais** em ambiente de produção

---

**🚀 Com essa integração, você terá rastreamento completo do funil de conversão e otimização automática das campanhas!**
