# 🤖 NEURAL CHAIN: AGENDAMENTO INTELIGENTE

## 📋 **CONFIGURAÇÃO NO CLIENTECHAT**

### **1. CRIAR NOVA NEURAL CHAIN**
- **Nome:** `Agendamento Inteligente Fix Fogões`
- **Tipo:** Conversação Progressiva
- **Ativação:** Automática quando detectar intenção de agendamento

### **2. TRAINING CARDS (Cartões de Treinamento)**

#### **Card 1: Detecção de Intenção**
```
Título: Detectar Agendamento
Pergunta: O cliente quer agendar um serviço técnico?
Resposta: Sim, quando mencionar: agendar, marcar, técnico, visita, conserto, reparo, manutenção, quebrou, não funciona, problema
```

#### **Card 2: Coleta de Dados Básicos**
```
Título: Dados do Cliente
Pergunta: Quais são os dados básicos necessários?
Resposta: Nome completo, endereço completo, telefone, tipo de equipamento, descrição do problema
```

#### **Card 3: Verificação de Urgência**
```
Título: Urgência do Atendimento
Pergunta: Como verificar se é urgente?
Resposta: Perguntar: "Precisa para hoje ou pode ser agendado para os próximos dias?" Se disser hoje, urgente, emergência = SIM
```

### **3. FLUXO DA NEURAL CHAIN**

#### **ETAPA 1: SAUDAÇÃO E COLETA INICIAL**
```
Olá! Vou te ajudar a agendar um técnico para seu equipamento. 

Para encontrar o melhor horário, preciso de algumas informações:

1️⃣ Qual seu nome completo?
2️⃣ Qual o endereço completo? (rua, número, bairro, cidade)
3️⃣ Qual seu telefone/WhatsApp?
4️⃣ Que tipo de equipamento? (fogão, cooktop, coifa, lava-louças, etc.)
5️⃣ Qual o problema que está acontecendo?

Pode me passar essas informações?
```

#### **ETAPA 2: VERIFICAÇÃO DE URGÊNCIA**
```
Perfeito! Recebi todos os dados:
✅ Nome: [nome]
✅ Endereço: [endereco]  
✅ Telefone: [telefone]
✅ Equipamento: [equipamento]
✅ Problema: [problema]

Agora me diga: **Precisa para hoje ou pode ser agendado para os próximos dias?**

Se for urgente (hoje), vou buscar horários disponíveis ainda hoje.
Se puder aguardar, posso oferecer melhores opções nos próximos dias.
```

#### **ETAPA 3: CONSULTA DE DISPONIBILIDADE**
```
Função: consultar-disponibilidade
URL: https://fix-agendamento-production.up.railway.app/consultar-disponibilidade
Método: POST
Dados: {
  "endereco": "[endereco]",
  "equipamento": "[equipamento]", 
  "urgente": "[sim/não]",
  "data_preferida": "[se especificada]"
}
```

#### **ETAPA 4: APRESENTAÇÃO DE OPÇÕES**
```
[Resposta automática baseada na API]

Exemplo de resposta:
🗓️ **Horários Disponíveis** (Técnico: Paulo Cesar)

**1) Segunda, 29/06/2025**
⏰ 14:00 às 16:00

**2) Terça, 30/06/2025** 
⏰ 09:00 às 11:00

**3) Quarta, 01/07/2025**
⏰ 10:00 às 12:00

Qual horário prefere? Responda com o número da opção (1, 2 ou 3).
```

#### **ETAPA 5: CONFIRMAÇÃO E CRIAÇÃO DE OS**
```
Quando o cliente escolher o horário:

Função: agendamento-inteligente-completo
URL: https://fix-agendamento-production.up.railway.app/agendamento-inteligente-completo
Método: POST
Dados: {
  "nome": "[nome]",
  "endereco": "[endereco]",
  "equipamento": "[equipamento]",
  "problema": "[problema]",
  "telefone": "[telefone]",
  "urgente": "[sim/não]",
  "horario_escolhido": "[datetime_do_horario_escolhido]",
  "cpf": "[se fornecido]",
  "email": "[se fornecido]"
}
```

#### **ETAPA 6: CONFIRMAÇÃO FINAL**
```
[Resposta automática da API]

Exemplo:
✅ **Agendamento Confirmado!**

📋 **Ordem de Serviço:** OS-20250628-A1B2C3D4
👤 **Cliente:** João Silva
🔧 **Equipamento:** Fogão Brastemp
📅 **Data:** 29/06/2025
⏰ **Horário:** 14:00
👨‍🔧 **Técnico:** Paulo Cesar
💰 **Valor:** R$ 120,00

📱 **Contato:** (48) 98833-2664
Você receberá uma confirmação por WhatsApp 1 dia antes do atendimento.
```

### **4. CONFIGURAÇÕES AVANÇADAS**

#### **Timeout:** 5 minutos por etapa
#### **Fallback:** Se não conseguir agendar, direcionar para atendimento humano
#### **Validações:**
- Nome: mínimo 2 palavras
- Endereço: deve conter rua e número
- Telefone: formato brasileiro
- Equipamento: lista pré-definida
- Problema: mínimo 10 caracteres

### **5. MENSAGENS DE ERRO**

#### **Sem Horários Disponíveis:**
```
Não encontrei horários disponíveis para os próximos dias. 
Entre em contato pelo telefone (48) 98833-2664 para agendarmos manualmente.
```

#### **Erro Técnico:**
```
Ops! Ocorreu um problema técnico. 
Por favor, entre em contato pelo (48) 98833-2664 ou tente novamente em alguns minutos.
```

#### **Dados Incompletos:**
```
Preciso de mais algumas informações para continuar:
[listar campos faltantes]
```

### **6. ATIVADORES DA NEURAL CHAIN**

```
- "quero agendar"
- "preciso de um técnico"
- "marcar uma visita"
- "meu fogão quebrou"
- "cooktop não funciona"
- "problema na coifa"
- "lava-louças com defeito"
- "agendar conserto"
- "marcar manutenção"
- "técnico para hoje"
- "visita técnica"
```

### **7. INTEGRAÇÃO COM SISTEMA**

✅ **Middleware Railway:** Endpoints criados
✅ **Supabase:** Tabelas preparadas  
✅ **Fix Fogões:** Integração automática
✅ **WhatsApp:** Confirmações automáticas

---

## 🚀 **PRÓXIMOS PASSOS**

1. **Configurar no ClienteChat Dashboard**
2. **Testar fluxo completo**
3. **Ajustar mensagens conforme necessário**
4. **Ativar em produção**
