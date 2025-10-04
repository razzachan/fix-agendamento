# 🧪 Bateria de Testes End-to-End - Fluxo de Atendimento

## 📋 Equipamentos Atendidos

1. **Fogão / Cooktop**
2. **Forno (elétrico, a gás, embutir)**
3. **Micro-ondas (bancada, embutido)**
4. **Lava-louças**
5. **Lavadora / Lava-roupas**
6. **Lava e seca**
7. **Secadora**
8. **Coifa / Depurador / Exaustor**
9. **Adega climatizada**

---

## 🎯 Cenários de Teste por Equipamento

### 1️⃣ FOGÃO / COOKTOP

#### Teste 1.1: Fluxo completo com marca e problema na primeira mensagem
**Entrada:**
```
Usuário: Oi, meu fogão Brastemp de 5 bocas não acende
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=fogão, marca=Brastemp, problema=não acende, num_burners=5
- ✅ Bot pergunta: "É fogão de piso ou cooktop?"
- ✅ Usuário responde: "Piso"
- ✅ Bot gera orçamento automaticamente
- ✅ Bot NÃO repete perguntas sobre marca ou problema

#### Teste 1.2: Fluxo com dados incompletos
**Entrada:**
```
Usuário: Meu fogão não acende
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=fogão, problema=não acende
- ✅ Bot pergunta: "Para te passar o valor certinho, me diga: é fogão de piso ou cooktop? E ele é de 4, 5 ou 6 bocas?"
- ✅ Usuário responde: "Cooktop de 4 bocas"
- ✅ Bot pergunta: "Qual é a marca do fogão?"
- ✅ Usuário responde: "Electrolux"
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas já respondidas

#### Teste 1.3: Fluxo com problema descrito depois
**Entrada:**
```
Usuário: Tenho um fogão Consul de piso 5 bocas
Bot: Como posso ajudar?
Usuário: Duas bocas não acendem
```

**Comportamento Esperado:**
- ✅ Bot detecta problema na segunda mensagem
- ✅ Bot gera orçamento usando dados da sessão (marca=Consul, mount=piso, burners=5, problema=duas bocas não acendem)
- ✅ Bot NÃO pede marca novamente

---

### 2️⃣ LAVA-LOUÇAS

#### Teste 2.1: Fluxo completo com marca e problema
**Entrada:**
```
Usuário: Minha lava-louças Brastemp não lava direito
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lava-louças, marca=Brastemp, problema=não lava direito
- ✅ Bot gera orçamento automaticamente
- ✅ Bot NÃO pergunta marca ou problema novamente

#### Teste 2.2: Fluxo com dados incompletos
**Entrada:**
```
Usuário: Minha lava-louças não limpa bem
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lava-louças, problema=não limpa bem
- ✅ Bot pergunta: "Entendi que é lava-louças. Para orçar certinho: qual é a marca e qual é o problema específico?"
- ✅ Usuário responde: "Electrolux"
- ✅ Bot gera orçamento usando problema já detectado
- ✅ Bot NÃO repete pergunta sobre problema

#### Teste 2.3: Fluxo com problema descrito depois
**Entrada:**
```
Usuário: Tenho uma lava-louças
Bot: Como posso ajudar?
Usuário: Ela não seca as louças
```

**Comportamento Esperado:**
- ✅ Bot detecta problema na segunda mensagem
- ✅ Bot pergunta marca (se ainda não tem)
- ✅ Usuário responde: "Samsung"
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

#### Teste 2.4: Problema com variações de escrita
**Entrada:**
```
Usuário: Minha lava louça Consul deixa as louças sujas
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lava-louças, marca=Consul, problema=louças sujas
- ✅ Bot gera orçamento
- ✅ Bot NÃO pede dados novamente

---

### 3️⃣ MICRO-ONDAS

#### Teste 3.1: Micro-ondas de bancada
**Entrada:**
```
Usuário: Meu micro-ondas Panasonic de bancada não esquenta
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=micro-ondas, marca=Panasonic, mount=bancada, problema=não esquenta
- ✅ Bot gera orçamento com política de coleta+conserto
- ✅ Bot NÃO repete perguntas

#### Teste 3.2: Micro-ondas embutido
**Entrada:**
```
Usuário: Micro-ondas embutido Brastemp não funciona
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=micro-ondas, marca=Brastemp, mount=embutido, problema=não funciona
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

#### Teste 3.3: Fluxo com dados incompletos
**Entrada:**
```
Usuário: Meu micro-ondas não esquenta
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=micro-ondas, problema=não esquenta
- ✅ Bot pergunta: "Qual é a marca do equipamento?"
- ✅ Usuário responde: "LG"
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

---

### 4️⃣ LAVADORA / LAVA-ROUPAS

#### Teste 4.1: Fluxo completo
**Entrada:**
```
Usuário: Minha lavadora Electrolux não centrifuga
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lavadora, marca=Electrolux, problema=não centrifuga
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

#### Teste 4.2: Problema com água
**Entrada:**
```
Usuário: Máquina de lavar Consul não enche de água
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=máquina de lavar, marca=Consul, problema=não enche
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

#### Teste 4.3: Fluxo com dados incompletos
**Entrada:**
```
Usuário: Minha lavadora vaza água
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lavadora, problema=vaza água
- ✅ Bot pergunta marca
- ✅ Usuário responde: "Samsung"
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

---

### 5️⃣ LAVA E SECA

#### Teste 5.1: Fluxo completo
**Entrada:**
```
Usuário: Minha lava e seca LG não seca as roupas
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lava e seca, marca=LG, problema=não seca
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

#### Teste 5.2: Fluxo com dados incompletos
**Entrada:**
```
Usuário: Lava e seca não centrifuga
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=lava e seca, problema=não centrifuga
- ✅ Bot pergunta marca
- ✅ Usuário responde: "Brastemp"
- ✅ Bot gera orçamento

---

### 6️⃣ SECADORA

#### Teste 6.1: Fluxo completo
**Entrada:**
```
Usuário: Secadora Electrolux não aquece
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=secadora, marca=Electrolux, problema=não aquece
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

---

### 7️⃣ COIFA / DEPURADOR / EXAUSTOR

#### Teste 7.1: Fluxo completo
**Entrada:**
```
Usuário: Coifa Tramontina faz barulho
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=coifa, marca=Tramontina, problema=faz barulho
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

#### Teste 7.2: Depurador
**Entrada:**
```
Usuário: Depurador Fischer não funciona
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=depurador, marca=Fischer, problema=não funciona
- ✅ Bot gera orçamento

---

### 8️⃣ ADEGA CLIMATIZADA

#### Teste 8.1: Fluxo completo
**Entrada:**
```
Usuário: Adega Brastemp não gela
```

**Comportamento Esperado:**
- ✅ Bot detecta: equipamento=adega, marca=Brastemp, problema=não gela
- ✅ Bot gera orçamento
- ✅ Bot NÃO repete perguntas

---

## 🔄 Testes de Troca de Contexto

### Teste 9.1: Mudança de equipamento durante conversa
**Entrada:**
```
Usuário: Meu fogão Brastemp não acende
Bot: [responde sobre fogão]
Usuário: Na verdade, é minha lava-louças que está com problema
```

**Comportamento Esperado:**
- ✅ Bot detecta mudança de equipamento
- ✅ Bot limpa dados de marca/problema do fogão
- ✅ Bot pergunta sobre a lava-louças
- ✅ Bot NÃO reutiliza marca "Brastemp" para lava-louças

### Teste 9.2: Múltiplos equipamentos na mesma conversa
**Entrada:**
```
Usuário: Tenho um fogão e uma lava-louças com problema
```

**Comportamento Esperado:**
- ✅ Bot detecta ambiguidade
- ✅ Bot pergunta qual equipamento quer consertar primeiro
- ✅ Bot trata cada equipamento separadamente

---

## ⏱️ Testes de TTL (Time To Live)

### Teste 10.1: Dados expirados (30 minutos)
**Entrada:**
```
[Usuário forneceu marca e problema há 31 minutos]
Usuário: Quero agendar
```

**Comportamento Esperado:**
- ✅ Bot detecta que dados expiraram
- ✅ Bot pergunta marca e problema novamente
- ✅ Bot NÃO usa dados antigos

---

## 🚫 Testes de Cooldown

### Teste 11.1: Cooldown de perguntas (60 segundos)
**Entrada:**
```
Usuário: Meu fogão não acende
Bot: Qual é a marca?
[Usuário não responde por 30 segundos]
Usuário: Não sei
```

**Comportamento Esperado:**
- ✅ Bot NÃO repete a pergunta sobre marca (cooldown ativo)
- ✅ Bot tenta continuar o fluxo ou pede outra informação

---

## 📊 Resumo de Verificações Críticas

Para TODOS os equipamentos, verificar:

1. ✅ **Detecção de equipamento** - Bot identifica corretamente o equipamento
2. ✅ **Detecção de marca** - Bot extrai marca da mensagem ou sessão
3. ✅ **Detecção de problema** - Bot extrai problema da mensagem ou sessão
4. ✅ **Não repetir perguntas** - Bot NÃO pede dados já coletados
5. ✅ **Reutilização de dados** - Bot usa dados da sessão quando disponíveis
6. ✅ **Limpeza de dados** - Bot limpa dados ao trocar de equipamento
7. ✅ **TTL de dados** - Bot expira dados após 30 minutos
8. ✅ **Cooldown de perguntas** - Bot respeita cooldown de 60 segundos
9. ✅ **Geração de orçamento** - Bot gera orçamento quando tem todos os dados
10. ✅ **Fluxo de agendamento** - Bot continua para agendamento após orçamento aceito

---

## 🔧 Como Executar os Testes

### Opção 1: Testes Manuais via WhatsApp
1. Conectar bot no Railway
2. Enviar mensagens de teste do seu número
3. Verificar respostas e comportamento
4. Marcar ✅ ou ❌ para cada teste

### Opção 2: Testes Automatizados (Recomendado)
Criar script de testes que:
1. Simula conversas completas
2. Verifica respostas esperadas
3. Valida estado da sessão
4. Gera relatório de resultados

