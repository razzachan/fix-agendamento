# 🤖 Configuração ClienteChat - Tipos de Atendimento

## 🚨 **PROBLEMA IDENTIFICADO**

O ClienteChat não está enviando o parâmetro `tipo_atendimento_1` para o middleware, fazendo com que todos os agendamentos sejam criados como "em_domicilio" por padrão.

## ✅ **SOLUÇÃO - Configuração das Neural Chains**

### **📋 Parâmetros Necessários no ClienteChat:**

```json
{
  "nome": "#name_contact#",
  "endereco": "#endereco#", 
  "equipamento": "#equipamento#",
  "problema": "#problema#",
  "telefone": "#phone_contact#",
  "urgente": "#urgente#",
  "cpf": "#cpf#",
  "email": "#email#",
  "tipo_atendimento_1": "#tipo_atendimento#"
}
```

### **🎯 Configuração do Parâmetro `tipo_atendimento`:**

#### **Opção 1: Parâmetro Fixo por Neural Chain**
Criar 3 neural chains separadas:

**Neural Chain 1 - Coleta Diagnóstico:**
```json
{
  "tipo_atendimento_1": "coleta_diagnostico"
}
```

**Neural Chain 2 - Coleta Conserto:**
```json
{
  "tipo_atendimento_1": "coleta_conserto"
}
```

**Neural Chain 3 - Em Domicílio:**
```json
{
  "tipo_atendimento_1": "em_domicilio"
}
```

#### **Opção 2: Parâmetro Dinâmico (Recomendado)**
Uma neural chain que captura a escolha do usuário:

```json
{
  "tipo_atendimento_1": "#tipo_servico_escolhido#"
}
```

Onde `#tipo_servico_escolhido#` pode ser:
- `"coleta_diagnostico"` - quando cliente escolhe diagnóstico
- `"coleta_conserto"` - quando cliente escolhe conserto
- `"em_domicilio"` - quando cliente escolhe domicílio

### **🔧 Como Implementar no ClienteChat:**

#### **1. Criar Parâmetro de Captura:**
- Nome: `tipo_servico_escolhido`
- Tipo: `STRING`
- Valores possíveis:
  - `coleta_diagnostico`
  - `coleta_conserto` 
  - `em_domicilio`

#### **2. Configurar Fluxo de Conversa:**
```
Bot: "Qual tipo de atendimento você precisa?"
Bot: "1️⃣ Coleta para Diagnóstico (R$ 350,00)"
Bot: "2️⃣ Coleta para Conserto (preço variável)"
Bot: "3️⃣ Atendimento em Domicílio"

Cliente: "1" ou "diagnóstico" ou "coleta diagnóstico"
→ tipo_servico_escolhido = "coleta_diagnostico"

Cliente: "2" ou "conserto" ou "coleta conserto"  
→ tipo_servico_escolhido = "coleta_conserto"

Cliente: "3" ou "domicílio" ou "em casa"
→ tipo_servico_escolhido = "em_domicilio"
```

#### **3. Configurar Neural Chain:**
```json
{
  "nome": "#name_contact#",
  "endereco": "#endereco#",
  "equipamento": "#equipamento#", 
  "problema": "#problema#",
  "telefone": "#phone_contact#",
  "urgente": "#urgente#",
  "cpf": "#cpf#",
  "email": "#email#",
  "tipo_atendimento_1": "#tipo_servico_escolhido#"
}
```

## 🧪 **TESTE DA CONFIGURAÇÃO**

### **Dados de Teste - Coleta Diagnóstico:**
```json
{
  "nome": "João Silva",
  "endereco": "Rua das Flores, 123, Florianópolis, SC",
  "equipamento": "Fogão",
  "problema": "Não sei o que está acontecendo",
  "telefone": "48988332664",
  "urgente": "não",
  "tipo_atendimento_1": "coleta_diagnostico"
}
```

### **Dados de Teste - Coleta Conserto:**
```json
{
  "nome": "Maria Santos",
  "endereco": "Av. Principal, 456, Florianópolis, SC", 
  "equipamento": "Micro-ondas",
  "problema": "Precisa trocar a resistência",
  "telefone": "48999887766",
  "urgente": "não",
  "tipo_atendimento_1": "coleta_conserto"
}
```

## 🎯 **RESULTADO ESPERADO**

Com a configuração correta:

### **Coleta Diagnóstico:**
- ✅ Valor fixo: R$ 350,00
- ✅ Prazo: até 7 dias úteis
- ✅ Status inicial: `scheduled`
- ✅ `needs_pickup`: `true`

### **Coleta Conserto:**
- ✅ Valor variável (baseado no problema)
- ✅ Prazo: até 7 dias úteis  
- ✅ Status inicial: `scheduled`
- ✅ `needs_pickup`: `true`

### **Em Domicílio:**
- ✅ Valor variável
- ✅ Prazo: preferencialmente mesmo dia
- ✅ Status inicial: `scheduled`
- ✅ `needs_pickup`: `false`

## 🚀 **PRÓXIMOS PASSOS**

1. **Configurar o parâmetro no ClienteChat**
2. **Testar com dados reais**
3. **Verificar logs do middleware**
4. **Confirmar criação correta das OS**

O middleware está funcionando corretamente - o problema está na configuração do ClienteChat que não está enviando o `tipo_atendimento_1`.
