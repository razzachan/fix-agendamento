# 🏢 **PLANO DE EXPANSÃO: SISTEMA DE FRANQUIAS**

## 📋 **VISÃO GERAL**

Este documento detalha o plano estratégico para transformar o sistema Fix Fogões em uma plataforma multi-tenant, permitindo expansão através de franquias e múltiplas empresas.

---

## 🎯 **OBJETIVOS ESTRATÉGICOS**

### **📈 Escalabilidade Empresarial:**
- Suporte a múltiplas empresas/franquias
- Gestão centralizada com autonomia local
- Modelo de negócio escalável
- Controle de qualidade padronizado

### **💰 Modelo de Receita:**
- Taxa de setup inicial por franquia
- Mensalidade por empresa ativa
- Percentual sobre transações
- Serviços premium opcionais

---

## 🏗️ **ARQUITETURA MULTI-TENANT**

### **🔧 Semana 1-2: Infraestrutura Base**

#### **1. Reestruturação do Banco de Dados**
```sql
-- Nova tabela de empresas/franquias
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'basic',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  settings JSONB DEFAULT '{}',
  
  -- Dados da empresa
  cnpj VARCHAR(18),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Configurações de branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#E5B034',
  secondary_color VARCHAR(7) DEFAULT '#2c3e50',
  
  -- Limites do plano
  max_technicians INTEGER DEFAULT 10,
  max_orders_month INTEGER DEFAULT 1000,
  max_storage_gb INTEGER DEFAULT 5
);

-- Adicionar company_id em todas as tabelas principais
ALTER TABLE service_orders ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE technicians ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE clients ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE workshops ADD COLUMN company_id UUID REFERENCES companies(id);
-- ... e assim por diante
```

#### **2. Sistema de Autenticação Multi-Tenant**
```typescript
// Novo contexto de empresa
interface CompanyContext {
  company: Company;
  permissions: CompanyPermissions;
  plan: PlanLimits;
  usage: UsageMetrics;
}

// Middleware de tenant
const TenantMiddleware = (req, res, next) => {
  const subdomain = req.headers.host.split('.')[0];
  const company = getCompanyBySlug(subdomain);
  req.company = company;
  next();
};
```

#### **3. Isolamento de Dados (Row Level Security)**
```sql
-- RLS para isolamento por empresa
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY company_isolation ON service_orders
  FOR ALL USING (company_id = current_setting('app.current_company_id')::UUID);
```

### **🏢 Semana 3-4: Gestão de Franquias**

#### **1. Dashboard Master (Franqueador)**
- **Visão Consolidada:** Todas as franquias em um dashboard
- **Métricas Globais:** Performance geral da rede
- **Ranking de Franquias:** Top performers e que precisam de ajuda
- **Controle Financeiro:** Royalties, taxas, repasses

#### **2. Portal da Franquia**
- **Dashboard Local:** Métricas específicas da franquia
- **Gestão de Equipe:** Técnicos e oficinas locais
- **Relatórios Locais:** Performance da unidade
- **Suporte Técnico:** Canal direto com franqueador

#### **3. Sistema de Royalties**
```typescript
interface RoyaltyCalculation {
  franquia_id: string;
  periodo: string;
  faturamento_bruto: number;
  percentual_royalty: number;
  valor_royalty: number;
  taxa_marketing: number;
  valor_liquido: number;
  status_pagamento: 'pendente' | 'pago' | 'atrasado';
}
```

### **🔒 Semana 5-6: Segurança e Compliance**

#### **1. Auditoria Completa**
```typescript
interface AuditLog {
  id: string;
  company_id: string;
  user_id: string;
  action: string;
  resource: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
}
```

#### **2. Backup Multi-Tenant**
- **Backup Isolado:** Cada empresa tem backup separado
- **Restore Seletivo:** Restaurar apenas uma empresa
- **Compliance LGPD:** Direito ao esquecimento por empresa
- **Retenção de Dados:** Políticas por tipo de plano

#### **3. Monitoramento 24/7**
- **Health Check por Empresa:** Status individual
- **Alertas Personalizados:** Por franquia
- **SLA Diferenciado:** Por tipo de plano
- **Suporte Escalonado:** Níveis de atendimento

---

## 💼 **MODELOS DE NEGÓCIO**

### **📊 Planos de Franquia**

#### **🥉 Plano Básico - R$ 497/mês**
- Até 5 técnicos
- Até 200 ordens/mês
- 2GB de armazenamento
- Suporte por email
- Relatórios básicos

#### **🥈 Plano Profissional - R$ 997/mês**
- Até 15 técnicos
- Até 500 ordens/mês
- 10GB de armazenamento
- Suporte prioritário
- Analytics avançados
- API básica

#### **🥇 Plano Enterprise - R$ 1.997/mês**
- Técnicos ilimitados
- Ordens ilimitadas
- 50GB de armazenamento
- Suporte 24/7
- BI completo
- API completa
- White label

### **💰 Estrutura de Receita**
- **Taxa de Setup:** R$ 2.500 (única)
- **Royalty:** 3% do faturamento bruto
- **Taxa de Marketing:** 2% do faturamento bruto
- **Serviços Extras:** Treinamento, consultoria, customizações

---

## 🌐 **ARQUITETURA TÉCNICA AVANÇADA**

### **🔧 API Pública Completa**

#### **1. Documentação Swagger**
```yaml
openapi: 3.0.0
info:
  title: Fix Fogões API
  version: 2.0.0
  description: API completa para integração com sistemas externos

paths:
  /api/v2/orders:
    get:
      summary: Listar ordens de serviço
      parameters:
        - name: company_id
          in: header
          required: true
        - name: status
          in: query
        - name: technician_id
          in: query
```

#### **2. Webhooks para Integrações**
```typescript
interface WebhookEvent {
  event: 'order.created' | 'order.completed' | 'payment.received';
  company_id: string;
  data: any;
  timestamp: Date;
  signature: string; // HMAC para segurança
}
```

#### **3. Rate Limiting por Empresa**
```typescript
const rateLimits = {
  basic: { requests: 1000, window: '1h' },
  professional: { requests: 5000, window: '1h' },
  enterprise: { requests: 20000, window: '1h' }
};
```

### **📱 White Label Mobile**

#### **1. App Personalizado por Franquia**
- Logo e cores da franquia
- Nome personalizado na store
- Notificações com branding próprio
- Deep links personalizados

#### **2. Portal de Configuração**
- Upload de logo e assets
- Configuração de cores
- Textos personalizados
- Configurações de notificação

---

## 📊 **MÉTRICAS E KPIs DE REDE**

### **🎯 Dashboard do Franqueador**

#### **1. Métricas Globais**
- Total de franquias ativas
- Faturamento consolidado da rede
- Número total de ordens processadas
- Satisfação média dos clientes
- Taxa de crescimento da rede

#### **2. Ranking de Performance**
```typescript
interface FranchiseRanking {
  position: number;
  franchise_name: string;
  revenue_month: number;
  orders_completed: number;
  customer_satisfaction: number;
  growth_rate: number;
  efficiency_score: number;
}
```

#### **3. Alertas de Rede**
- Franquias com performance baixa
- Oportunidades de expansão
- Problemas técnicos por região
- Tendências de mercado

### **📈 Relatórios Consolidados**
- **Relatório Mensal de Rede:** Performance geral
- **Análise de Mercado:** Tendências por região
- **Benchmarking:** Comparação entre franquias
- **Previsão de Crescimento:** Projeções baseadas em IA

---

## 🚀 **PLANO DE IMPLEMENTAÇÃO**

### **📅 Cronograma Detalhado**

#### **Mês 1: Infraestrutura**
- Semana 1-2: Reestruturação do banco
- Semana 3-4: Sistema multi-tenant

#### **Mês 2: Funcionalidades**
- Semana 1-2: Dashboard master
- Semana 3-4: Portal da franquia

#### **Mês 3: Segurança e API**
- Semana 1-2: Auditoria e backup
- Semana 3-4: API pública

#### **Mês 4: Testes e Lançamento**
- Semana 1-2: Testes com franquia piloto
- Semana 3-4: Lançamento oficial

### **💰 Investimento Estimado**
- **Desenvolvimento:** R$ 150.000
- **Infraestrutura:** R$ 20.000
- **Marketing de Lançamento:** R$ 50.000
- **Total:** R$ 220.000

### **📊 Projeção de Retorno**
- **Ano 1:** 10 franquias = R$ 600.000
- **Ano 2:** 25 franquias = R$ 1.500.000
- **Ano 3:** 50 franquias = R$ 3.000.000

---

## 🎯 **PRÓXIMOS PASSOS PARA FRANQUIA**

### **🔍 Quando Implementar:**
1. **Após MVP 4 (Analytics)** estar completo
2. **Quando houver demanda** de pelo menos 3 interessados
3. **Com capital disponível** para investimento inicial
4. **Equipe expandida** para suporte a múltiplas empresas

### **📋 Pré-requisitos:**
- Sistema atual 100% estável
- Documentação completa
- Processos bem definidos
- Equipe de suporte estruturada

### **🎯 Indicadores para Início:**
- Faturamento mensal > R$ 100.000
- Mais de 1.000 ordens/mês processadas
- Taxa de satisfação > 95%
- Equipe com mais de 10 pessoas

---

## 📝 **CONCLUSÃO**

O modelo de franquias representa uma **oportunidade estratégica** de expansão do Fix Fogões, transformando-o de uma solução local em uma **rede nacional de assistência técnica**.

**Este plano deve ser executado quando:**
- ✅ O sistema atual estiver maduro
- ✅ Houver demanda comprovada
- ✅ A equipe estiver preparada
- ✅ O capital estiver disponível

**Potencial de crescimento:** Sistema local → Rede nacional → IPO 🚀

---

*Documento criado em Janeiro 2025 - Fix Fogões Expansion Plan*
