# 🧠 Instrução Inteligente para ClienteChat - Neural Chain 2

## 📋 Configuração da Neural Chain ID: 14169

### **🔧 Instrução de Segundo Nível (Inteligente):**

```
🎉 *AGENDAMENTO CONFIRMADO COM SUCESSO!*

📋 *Detalhes do Agendamento:*
• *OS:* #ordem_servico_numero#
• *Cliente:* #name_contact#
• *Horário:* #horario_agendado#
• *Técnico:* #tecnico_nome#
• *Valor:* #valor_servico#

📍 *Endereço:* #endereco#
🔧 *Equipamento(s):* %%% #external_return#.split("EQUIPAMENTOS:")[1].split("|")[0] %%%
⚠️ *Problema:* #problema#

%%% if #external_return#.includes("QTD_EQUIPAMENTOS:") && parseInt(#external_return#.split("QTD_EQUIPAMENTOS:")[1].split("|")[0]) > 1 %%%
📦 *Total de equipamentos:* %%% #external_return#.split("QTD_EQUIPAMENTOS:")[1].split("|")[0] %%%
%%% endif %%%

✅ *Confirmação:* Seu agendamento foi confirmado! O técnico entrará em contato 30 minutos antes da chegada.

---

🔐 *ACESSO AO PORTAL ONLINE:*

%%% if #external_return#.includes("CONTA_CRIADA:SIM") %%%
*🎉 SUA CONTA FOI CRIADA!*
Agora você pode acompanhar sua OS online:

📧 *Email:* %%% #external_return#.split("EMAIL:")[1].split("|")[0] %%%
🔑 *Senha:* %%% #external_return#.split("SENHA:")[1].split("|")[0] %%%
🌐 *Portal:* %%% #external_return#.split("PORTAL:")[1].split("|")[0] %%%

📱 *ACOMPANHE ONLINE:*
✅ Status em tempo real
✅ Fotos do processo de reparo
✅ Notificações automáticas
✅ Histórico completo

💾 *Salve estes dados para acessar sempre!*
%%% else %%%
*📱 PORTAL ONLINE:*
Se você já tem conta, acesse: app.fixfogoes.com.br
Acompanhe sua OS em tempo real!
%%% endif %%%

---

📞 *Dúvidas?* Entre em contato: (48) 98833-2664

*Fix Fogões* - Assistência Técnica Especializada
```

## 🧠 Como Funciona a Lógica Inteligente:

### **1. 📊 Dados Estruturados do Middleware:**

#### **🔧 Um Equipamento:**
```
AGENDAMENTO_CONFIRMADO|OS:001|CLIENTE:João|HORARIO:10h-11h|TECNICO:Paulo|VALOR:R$ 150,00|EQUIPAMENTOS:Fogão|QTD_EQUIPAMENTOS:1|CONTA_CRIADA:SIM|EMAIL:joao@gmail.com|SENHA:123456789|PORTAL:app.fixfogoes.com.br
```

#### **🔧 Múltiplos Equipamentos:**
```
AGENDAMENTO_CONFIRMADO|OS:002|CLIENTE:Maria|HORARIO:14h-15h|TECNICO:Paulo|VALOR:R$ 280,00|EQUIPAMENTOS:Fogão, Geladeira e Micro-ondas|QTD_EQUIPAMENTOS:3|CONTA_CRIADA:NAO
```

### **2. 🔍 Detecção Inteligente:**
- **Se contém "CONTA_CRIADA:SIM"** → Mostra dados de acesso
- **Se contém "CONTA_CRIADA:NAO"** → Apenas menciona portal

### **3. 📝 Extração de Dados:**
- **Email:** `#external_return#.split("EMAIL:")[1].split("|")[0]`
- **Senha:** `#external_return#.split("SENHA:")[1].split("|")[0]`
- **Portal:** `#external_return#.split("PORTAL:")[1].split("|")[0]`

## 🎯 Vantagens da Abordagem Inteligente:

### **✅ Middleware (Lógica):**
- Detecta automaticamente se conta foi criada
- Retorna dados estruturados
- Lógica complexa no backend

### **✅ Instrução (Flexibilidade):**
- Usa operadores %%% para lógica condicional
- Editável sem deploy
- Personalização total da mensagem

### **✅ Resultado:**
- **Conta nova:** Mostra email, senha e instruções
- **Conta existente:** Apenas menciona portal
- **Sempre atualizado:** Sem necessidade de deploy

## 📱 Exemplos de Mensagens Finais:

### **🆕 Cliente Novo - Um Equipamento:**
```
🎉 AGENDAMENTO CONFIRMADO COM SUCESSO!

📋 Detalhes do Agendamento:
• OS: #001
• Cliente: João Silva
• Horário: 10h-11h
• Técnico: Paulo Cesar
• Valor: R$ 150,00
• Equipamento(s): Fogão

🔐 SUA CONTA FOI CRIADA!
📧 Email: joao@gmail.com
🔑 Senha: 123456789
🌐 Portal: app.fixfogoes.com.br

📱 ACOMPANHE ONLINE:
✅ Status em tempo real
✅ Fotos do processo de reparo
💾 Salve estes dados!
```

### **🆕 Cliente Novo - Múltiplos Equipamentos:**
```
🎉 AGENDAMENTO CONFIRMADO COM SUCESSO!

📋 Detalhes do Agendamento:
• OS: #003
• Cliente: Ana Costa
• Horário: 9h-10h
• Técnico: Paulo Cesar
• Valor: R$ 280,00
• Equipamento(s): Fogão, Geladeira e Micro-ondas
📦 Total de equipamentos: 3

🔐 SUA CONTA FOI CRIADA!
📧 Email: ana@gmail.com
🔑 Senha: 123456789
🌐 Portal: app.fixfogoes.com.br

📱 ACOMPANHE ONLINE:
✅ Status em tempo real
✅ Fotos do processo de reparo
💾 Salve estes dados!
```

### **👤 Cliente Existente:**
```
🎉 AGENDAMENTO CONFIRMADO COM SUCESSO!

📋 Detalhes do Agendamento:
• OS: #002
• Cliente: Maria Santos
• Horário: 14h-15h
• Equipamento(s): Fogão e Geladeira
📦 Total de equipamentos: 2

📱 PORTAL ONLINE:
Se você já tem conta, acesse: app.fixfogoes.com.br
Acompanhe sua OS em tempo real!
```

## 🚀 Implementação:

1. **✅ Middleware atualizado** - Retorna dados estruturados
2. **📝 Copiar instrução** para Neural Chain 14169
3. **🧪 Testar** com cliente novo e existente
4. **🔧 Ajustar** conforme necessário (sem deploy!)
