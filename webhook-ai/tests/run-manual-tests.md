# 🧪 Guia de Testes Manuais - Checklist Rápido

## 📋 Como Usar Este Guia

1. Conecte o bot no Railway
2. Abra o WhatsApp e envie as mensagens de teste
3. Marque ✅ ou ❌ para cada teste
4. Anote observações se necessário

---

## 🎯 TESTES RÁPIDOS (15 minutos)

### ✅ 1. FOGÃO - Fluxo Completo
```
📱 Você: Oi, meu fogão Brastemp de 5 bocas não acende
🤖 Bot: [deve perguntar APENAS sobre piso/cooktop]
📱 Você: Piso
🤖 Bot: [deve dar orçamento SEM pedir marca ou problema]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 2. LAVA-LOUÇAS - Fluxo Completo
```
📱 Você: Minha lava-louças Brastemp não lava direito
🤖 Bot: [deve dar orçamento SEM pedir marca ou problema]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 3. LAVA-LOUÇAS - Problema Detectado
```
📱 Você: Lava louça Consul deixa as louças sujas
🤖 Bot: [deve dar orçamento SEM pedir marca ou problema]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 4. MICRO-ONDAS - Bancada
```
📱 Você: Meu micro-ondas Panasonic de bancada não esquenta
🤖 Bot: [deve dar orçamento SEM pedir marca ou problema]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 5. LAVADORA - Fluxo Completo
```
📱 Você: Minha lavadora Electrolux não centrifuga
🤖 Bot: [deve dar orçamento SEM pedir marca ou problema]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 6. COIFA - Fluxo Completo
```
📱 Você: Coifa Tramontina faz barulho
🤖 Bot: [deve dar orçamento SEM pedir marca ou problema]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

## 🔄 TESTES DE NÃO REPETIÇÃO (10 minutos)

### ✅ 7. LAVA-LOUÇAS - Não Repetir Marca
```
📱 Você: Minha lava-louças não limpa bem
🤖 Bot: [deve pedir marca]
📱 Você: Electrolux
🤖 Bot: [deve dar orçamento SEM pedir problema novamente]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 8. FOGÃO - Não Repetir Problema
```
📱 Você: Meu fogão não acende
🤖 Bot: [deve pedir piso/cooktop e bocas]
📱 Você: Cooktop de 4 bocas
🤖 Bot: [deve pedir APENAS marca, NÃO problema]
📱 Você: Electrolux
🤖 Bot: [deve dar orçamento]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

### ✅ 9. MICRO-ONDAS - Não Repetir Problema
```
📱 Você: Meu micro-ondas não esquenta
🤖 Bot: [deve pedir APENAS marca, NÃO problema]
📱 Você: LG
🤖 Bot: [deve dar orçamento]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

## 🔀 TESTES DE TROCA DE CONTEXTO (5 minutos)

### ✅ 10. Mudança de Equipamento
```
📱 Você: Meu fogão Brastemp não acende
🤖 Bot: [responde sobre fogão]
📱 Você: Na verdade, é minha lava-louças que está com problema
🤖 Bot: [deve perguntar sobre lava-louças, NÃO usar marca Brastemp]
```
**Status:** [ ] ✅ Passou  [ ] ❌ Falhou  
**Observações:** _______________

---

## 📊 RESUMO DOS TESTES

**Total de testes:** 10  
**Passaram:** _____ / 10  
**Falharam:** _____ / 10  
**Taxa de sucesso:** _____ %

---

## 🚨 PROBLEMAS CRÍTICOS ENCONTRADOS

Se algum teste falhou, descreva o problema:

1. **Teste #___:**  
   Problema: _______________  
   Comportamento esperado: _______________  
   Comportamento real: _______________

2. **Teste #___:**  
   Problema: _______________  
   Comportamento esperado: _______________  
   Comportamento real: _______________

3. **Teste #___:**  
   Problema: _______________  
   Comportamento esperado: _______________  
   Comportamento real: _______________

---

## ✅ CHECKLIST DE VERIFICAÇÃO GERAL

Para CADA teste, verificar:

- [ ] Bot detectou equipamento corretamente
- [ ] Bot detectou marca corretamente (quando fornecida)
- [ ] Bot detectou problema corretamente (quando fornecido)
- [ ] Bot NÃO repetiu perguntas já respondidas
- [ ] Bot usou dados da sessão quando disponíveis
- [ ] Bot gerou orçamento quando tinha todos os dados
- [ ] Bot NÃO pediu dados desnecessários

---

## 🔧 COMO REPORTAR PROBLEMAS

Se encontrou problemas:

1. **Anote o número do teste que falhou**
2. **Copie a conversa completa** (suas mensagens + respostas do bot)
3. **Descreva o comportamento esperado vs. real**
4. **Tire screenshots se possível**
5. **Envie para o desenvolvedor**

---

## 📝 NOTAS ADICIONAIS

Use este espaço para anotações gerais:

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________

