# 📚 DOCUMENTAÇÃO API CLIENTECHAT - FIX FOGÕES

## 🎯 **VISÃO GERAL**

Esta documentação descreve os novos endpoints implementados no middleware Fix Fogões para integração com o ClienteChat, permitindo consultas e ações via WhatsApp.

### 🔗 **URL Base**
```
https://fix-agendamento-production.up.railway.app
```

### 📋 **Endpoints Disponíveis**
- **GET** `/api/clientechat/client/{phone}/orders` - Buscar ordens do cliente
- **GET** `/api/clientechat/order/{order_id}/status` - Status da ordem
- **GET** `/api/clientechat/order/{order_id}/budget` - Orçamento da ordem
- **POST** `/api/clientechat/order/{order_id}/approve-budget` - Aprovar orçamento
- **POST** `/api/clientechat/order/{order_id}/schedule` - Reagendar ordem
- **POST** `/api/clientechat/client/feedback` - Enviar feedback

---

## 📱 **ENDPOINTS GET - CONSULTAS**

### 1. **Buscar Ordens do Cliente**

#### **Endpoint:**
```
GET /api/clientechat/client/{phone}/orders
```

#### **Parâmetros:**
- `phone` (string): Número de telefone do cliente (apenas números)

#### **Exemplo de Requisição:**
```bash
curl -X GET "https://fix-agendamento-production.up.railway.app/api/clientechat/client/48999999999/orders"
```

#### **Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "📋 *Suas Ordens de Serviço* (2 encontradas):\n\n⏳ *PA-abc12345*\nMicro-ondas Brastemp\n📍 Status: Pendente\n📅 Criado: 2025-12-27\n\n🔧 *OS #001*\nFogão Consul\n📍 Status: Em Andamento\n💰 Valor: R$ 250,00\n📅 Criado: 2025-12-25",
  "data": {
    "pre_agendamentos": [...],
    "ordens_servico": [...],
    "total": 2
  },
  "phone": "48999999999"
}
```

#### **Resposta Sem Dados:**
```json
{
  "success": true,
  "message": "Não encontrei nenhuma ordem de serviço para este telefone. 🤔\n\nTalvez você tenha usado outro número? Ou quer criar uma nova solicitação?",
  "data": {
    "pre_agendamentos": [],
    "ordens_servico": [],
    "total": 0
  }
}
```

### 2. **Status da Ordem**

#### **Endpoint:**
```
GET /api/clientechat/order/{order_id}/status
```

#### **Parâmetros:**
- `order_id` (string): ID da ordem de serviço ou pré-agendamento

#### **Exemplo de Requisição:**
```bash
curl -X GET "https://fix-agendamento-production.up.railway.app/api/clientechat/order/abc123/status"
```

#### **Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "🔧 *OS #001* - Micro-ondas Brastemp\n\n👤 Cliente: João Silva\n📍 Status: Em Andamento\n👨‍🔧 Técnico: Paulo Cesar\n📅 Agendado: 2025-12-28\n💰 Valor: R$ 189,90\n\n📅 Criado em: 2025-12-27",
  "data": {
    "tipo": "ordem_servico",
    "id": "abc123",
    "numero": "OS #001",
    "cliente": "João Silva",
    "equipamento": "Micro-ondas Brastemp",
    "status": "in_progress",
    "tecnico": "Paulo Cesar",
    "valor_final": "189.90"
  }
}
```

### 3. **Orçamento da Ordem**

#### **Endpoint:**
```
GET /api/clientechat/order/{order_id}/budget
```

#### **Exemplo de Resposta (Orçamento Disponível):**
```json
{
  "success": true,
  "message": "💰 *Orçamento - OS #001*\n\n🔧 Micro-ondas Brastemp\n💵 Valor Total: *R$ 189,90*\n📋 Serviço: Troca de resistência\n\n⏳ *Aguardando sua aprovação*\nPara aprovar, responda: *aprovar OS #001*",
  "data": {
    "id": "abc123",
    "numero": "OS #001",
    "valor_total": "189.90",
    "aprovado": false
  }
}
```

#### **Exemplo de Resposta (Sem Orçamento):**
```json
{
  "success": true,
  "message": "⏳ *Orçamento em Preparação*\n\nSeu orçamento ainda está sendo preparado pela nossa equipe técnica.\n\nVocê receberá uma notificação assim que estiver pronto!",
  "data": {
    "status": "sem_orcamento"
  }
}
```

---

## 🔧 **ENDPOINTS POST - AÇÕES**

### 1. **Aprovar Orçamento**

#### **Endpoint:**
```
POST /api/clientechat/order/{order_id}/approve-budget
```

#### **Parâmetros:**
- `order_id` (string): ID da ordem de serviço

#### **Exemplo de Requisição:**
```bash
curl -X POST "https://fix-agendamento-production.up.railway.app/api/clientechat/order/abc123/approve-budget"
```

#### **Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "✅ *Orçamento Aprovado!*\n\nSeu orçamento da ordem abc123 foi aprovado com sucesso!\n\n🔧 Nosso técnico iniciará o serviço em breve.\n📱 Você receberá atualizações sobre o progresso.",
  "data": {
    "sucesso": true,
    "ordem_id": "abc123",
    "novo_status": "budget_approved"
  }
}
```

#### **Resposta de Erro:**
```json
{
  "success": false,
  "message": "Não foi possível aprovar o orçamento: Status atual não permite aprovação",
  "error": "Status atual não permite aprovação"
}
```

### 2. **Reagendar Ordem**

#### **Endpoint:**
```
POST /api/clientechat/order/{order_id}/schedule
```

#### **Body (JSON):**
```json
{
  "nova_data": "2025-12-30T14:00:00Z"
}
```

#### **Exemplo de Requisição:**
```bash
curl -X POST "https://fix-agendamento-production.up.railway.app/api/clientechat/order/abc123/schedule" \
  -H "Content-Type: application/json" \
  -d '{"nova_data": "2025-12-30T14:00:00Z"}'
```

#### **Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "📅 *Reagendamento Confirmado!*\n\nSua ordem foi reagendada para: 2025-12-30\n\n✅ Confirmação enviada para nossa equipe.\n📱 Você receberá lembretes próximo à data.",
  "data": {
    "sucesso": true,
    "ordem_id": "abc123",
    "nova_data": "2025-12-30T14:00:00Z"
  }
}
```

### 3. **Enviar Feedback**

#### **Endpoint:**
```
POST /api/clientechat/client/feedback
```

#### **Body (JSON):**
```json
{
  "telefone": "48999999999",
  "ordem_id": "abc123",
  "avaliacao": 5,
  "comentario": "Excelente atendimento!"
}
```

#### **Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "✅ Obrigado pelo seu feedback!\n\nSua avaliação é muito importante para melhorarmos nossos serviços.",
  "data": {
    "telefone": "48999999999",
    "ordem_id": "abc123",
    "avaliacao": 5
  }
}
```

---

## 🤖 **INTEGRAÇÃO COM CLIENTECHAT**

### **Configuração Neural Chains**

#### **1. Comando para Consultar Ordens:**
```
Quando cliente perguntar sobre "minhas ordens", "meus serviços", "histórico":
→ Fazer GET /api/clientechat/client/{telefone_cliente}/orders
→ Retornar message da resposta
```

#### **2. Comando para Status Específico:**
```
Quando cliente mencionar número de ordem (ex: "OS #001", "PA-abc123"):
→ Extrair ID da ordem
→ Fazer GET /api/clientechat/order/{order_id}/status
→ Retornar message da resposta
```

#### **3. Comando para Aprovar Orçamento:**
```
Quando cliente disser "aprovar" + número da ordem:
→ Extrair ID da ordem
→ Fazer POST /api/clientechat/order/{order_id}/approve-budget
→ Retornar message da resposta
```

### **Exemplos de Conversas:**

#### **Consulta de Histórico:**
```
Cliente: "Oi, quero ver minhas ordens"
ClienteChat: [GET /api/clientechat/client/48999999999/orders]
ClienteChat: "📋 Suas Ordens de Serviço (2 encontradas):
⏳ PA-abc12345
🔧 Micro-ondas Brastemp
📍 Status: Pendente
..."
```

#### **Aprovação de Orçamento:**
```
Cliente: "aprovar OS #001"
ClienteChat: [POST /api/clientechat/order/abc123/approve-budget]
ClienteChat: "✅ Orçamento Aprovado!
Seu orçamento foi aprovado com sucesso!
🔧 Nosso técnico iniciará o serviço em breve."
```

---

## 🔧 **CÓDIGOS DE RESPOSTA**

### **Sucesso:**
- `200 OK` - Requisição processada com sucesso
- `success: true` - Operação realizada com sucesso

### **Erro:**
- `200 OK` com `success: false` - Erro de negócio (ex: ordem não encontrada)
- `400 Bad Request` - Dados inválidos na requisição
- `500 Internal Server Error` - Erro interno do servidor

---

## 🧪 **TESTES**

### **Scripts Disponíveis:**
- `test_clientechat_endpoints.py` - Testes básicos dos endpoints
- `test_clientechat_real_data.py` - Testes com dados reais do banco

### **Executar Testes:**
```bash
python test_clientechat_endpoints.py
python test_clientechat_real_data.py
```

---

## 📞 **SUPORTE**

Para dúvidas ou problemas com a integração:
1. Verificar logs do middleware no Railway
2. Testar endpoints com scripts fornecidos
3. Verificar conectividade com Supabase
4. Validar formato dos dados enviados

**Logs disponíveis em:** Railway Dashboard → fix-agendamento-production
