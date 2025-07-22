# 💰 ClienteChat - Valores dos Serviços

## 🎯 **REGRA PRINCIPAL**

### **📱 TODOS OS VALORES VÊM DO CLIENTECHAT**
- ✅ **em_domicilio**: Valor definido pelo ClienteChat
- ✅ **coleta_conserto**: Valor definido pelo ClienteChat  
- ✅ **coleta_diagnostico**: Valor definido pelo ClienteChat
- ✅ **Fallbacks**: Apenas para casos excepcionais

## 📊 **COMO O CLIENTECHAT DEVE ENVIAR**

### **🔧 Estrutura do JSON:**
```json
{
  "nome": "João Silva",
  "telefone": "48999887766",
  "endereco": "Rua das Flores, 123, Centro, Florianópolis, SC",
  "equipamento": "Fogão Consul 4 bocas",
  "problema": "Não acende",
  "tipo_servico": "coleta_diagnostico",
  "valor_servico": 80.00
}
```

### **💰 Valores por Tipo de Serviço:**

#### **🏠 Em Domicílio:**
```json
{
  "tipo_servico": "em_domicilio",
  "valor_servico": 150.00
}
```

#### **🔧 Coleta Conserto:**
```json
{
  "tipo_servico": "coleta_conserto", 
  "valor_servico": 120.00
}
```

#### **🔍 Coleta Diagnóstico:**
```json
{
  "tipo_servico": "coleta_diagnostico",
  "valor_servico": 80.00
}
```

## 🔄 **FLUXO DE VALORES NO SISTEMA**

### **📱 1. ClienteChat Define o Valor:**
```
ClienteChat Neural Chain → valor_servico: 80.00
```

### **🚀 2. Middleware Recebe:**
```python
data = await request.json()
valor_servico = data.get("valor_servico")  # 80.00
logger.info(f"💰 VALOR DO SERVIÇO recebido do ClienteChat: R$ {valor_servico}")
```

### **💾 3. Salva no Pré-Agendamento:**
```python
pre_agendamento_data = {
    "valor_servico": valor_servico,  # 80.00
    "tipo_atendimento_1": tipo_servico  # "coleta_diagnostico"
}
```

### **🎯 4. Usa na Criação da OS:**
```python
valor_clientechat = pre_agendamento.get('valor_servico')  # 80.00
final_cost = obter_valor_servico(service_type, valor_clientechat)
```

### **✅ 5. Função obter_valor_servico:**
```python
def obter_valor_servico(tipo_atendimento: str, valor_clientechat: float = None) -> float:
    if valor_clientechat and valor_clientechat > 0:
        valor_final = valor_clientechat  # ✅ USA VALOR DO CLIENTECHAT
        logger.info(f"📱 VALOR DO CLIENTECHAT: R$ {valor_final} para {tipo_atendimento}")
        return valor_final
    else:
        # Fallback apenas para casos excepcionais
        valores_fallback = {
            "em_domicilio": 150.00,
            "coleta_conserto": 120.00,
            "coleta_diagnostico": 350.00
        }
        valor_final = valores_fallback.get(tipo_atendimento, 150.00)
        logger.warning(f"⚠️ FALLBACK: Usando valor padrão R$ {valor_final}")
        return valor_final
```

## 📋 **CONFIGURAÇÃO NO CLIENTECHAT**

### **🧠 Neural Chain - Parâmetros:**
```
nome: STRING
telefone: STRING  
endereco: STRING
equipamento: STRING
problema: STRING
tipo_servico: STRING
valor_servico: NUMBER
```

### **🎯 Valores Recomendados:**
```javascript
// Definir valores baseados no tipo de serviço
if (tipo_servico === "em_domicilio") {
    valor_servico = 150.00;
} else if (tipo_servico === "coleta_conserto") {
    valor_servico = 120.00;
} else if (tipo_servico === "coleta_diagnostico") {
    valor_servico = 80.00;
}
```

### **📱 Exemplo de Neural Chain:**
```
Função: agendamento-inteligente
URL: https://fix-agendamento-production.up.railway.app/agendamento-inteligente
Método: POST

Dados: {
  "nome": "#name_contact#",
  "telefone": "#phone_contact#", 
  "endereco": "#endereco_cliente#",
  "equipamento": "#equipamento_escolhido#",
  "problema": "#problema_relatado#",
  "tipo_servico": "#tipo_servico_escolhido#",
  "valor_servico": #valor_calculado#
}
```

## 🧪 **TESTES DE VALIDAÇÃO**

### **✅ Teste 1: Coleta Diagnóstico**
```bash
curl -X POST "https://fix-agendamento-production.up.railway.app/agendamento-inteligente" \
-H "Content-Type: application/json" \
-d '{
  "nome": "João Silva",
  "telefone": "48999887766",
  "endereco": "Rua Teste, 123, Florianópolis",
  "equipamento": "Fogão Consul",
  "problema": "Não acende",
  "tipo_servico": "coleta_diagnostico",
  "valor_servico": 80
}'
```

**Resultado Esperado:**
```
💰 VALOR DO SERVIÇO recebido do ClienteChat: R$ 80
📱 VALOR DO CLIENTECHAT: R$ 80.0 para coleta_diagnostico
✅ Valor final definido: R$ 80.0
```

### **✅ Teste 2: Em Domicílio**
```bash
curl -X POST "https://fix-agendamento-production.up.railway.app/agendamento-inteligente" \
-H "Content-Type: application/json" \
-d '{
  "nome": "Maria Santos",
  "telefone": "48988776655",
  "endereco": "Rua Nova, 456, Florianópolis", 
  "equipamento": "Fogão Brastemp",
  "problema": "Não acende",
  "tipo_servico": "em_domicilio",
  "valor_servico": 150
}'
```

**Resultado Esperado:**
```
💰 VALOR DO SERVIÇO recebido do ClienteChat: R$ 150
📱 VALOR DO CLIENTECHAT: R$ 150.0 para em_domicilio
✅ Valor final definido: R$ 150.0
```

### **✅ Teste 3: Coleta Conserto**
```bash
curl -X POST "https://fix-agendamento-production.up.railway.app/agendamento-inteligente" \
-H "Content-Type: application/json" \
-d '{
  "nome": "Carlos Lima",
  "telefone": "48987654321",
  "endereco": "Rua Final, 789, Florianópolis",
  "equipamento": "Fogão Electrolux", 
  "problema": "Não acende",
  "tipo_servico": "coleta_conserto",
  "valor_servico": 120
}'
```

**Resultado Esperado:**
```
💰 VALOR DO SERVIÇO recebido do ClienteChat: R$ 120
📱 VALOR DO CLIENTECHAT: R$ 120.0 para coleta_conserto
✅ Valor final definido: R$ 120.0
```

## ⚠️ **CASOS EXCEPCIONAIS (FALLBACK)**

### **🚨 Quando o Fallback é Usado:**
- ClienteChat não envia `valor_servico`
- `valor_servico` é 0 ou negativo
- `valor_servico` é null/undefined

### **📊 Valores de Fallback:**
```python
valores_fallback = {
    "em_domicilio": 150.00,
    "coleta_conserto": 120.00, 
    "coleta_diagnostico": 350.00  # NÃO mais R$ 280,00!
}
```

### **📝 Log de Fallback:**
```
⚠️ VALOR DO SERVIÇO não informado pelo ClienteChat
⚠️ FALLBACK: Usando valor padrão R$ 150.0 para em_domicilio
```

## 🎯 **RESUMO EXECUTIVO**

### **✅ REGRA PRINCIPAL:**
**TODOS os valores dos serviços devem vir do ClienteChat através do parâmetro `valor_servico`.**

### **💰 Valores Corretos:**
- ✅ **coleta_diagnostico**: R$ 80,00 (ClienteChat)
- ✅ **coleta_conserto**: R$ 120,00 (ClienteChat)  
- ✅ **em_domicilio**: R$ 150,00 (ClienteChat)

### **🔧 Implementação:**
- ✅ **Função**: `obter_valor_servico()` já implementada corretamente
- ✅ **Prioridade**: Sempre usa valor do ClienteChat primeiro
- ✅ **Fallback**: Apenas para casos excepcionais
- ✅ **Logs**: Detalhados para monitoramento

### **📊 Status:**
**O sistema está configurado corretamente para receber TODOS os valores do ClienteChat! Basta configurar as Neural Chains para enviar o parâmetro `valor_servico` com o valor correto para cada tipo de serviço. 💰✨**

---

**Agora todos os valores vêm do ClienteChat como deve ser! O sistema nunca mais vai usar valores fixos incorretos. 🎯💰**
