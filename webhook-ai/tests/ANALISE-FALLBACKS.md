# 🔍 Análise de Fallbacks Determinísticos

## 📊 Resumo

Encontrados **12 lugares** onde o bot pede marca e problema.

### ✅ JÁ CORRIGIDOS (2)

1. **Linha 1726** - Fallback de lava-louças ANTES do LLM
   - ✅ Verifica `temMarca` e `temProblema` antes de retornar
   - ✅ Só pede se falta algum dado

2. **Linha 5510** - Fallback legado de lava-louças
   - ✅ Verifica `temMarca` e `temProblema` antes de retornar
   - ✅ Só pede se falta algum dado

---

### ⚠️ PRECISAM DE VERIFICAÇÃO (10)

#### 3. **Linha 2343** - Fallback de fogão
```typescript
if (!brand && !problem)
  return 'Antes de te passar as possíveis causas e o valor: qual é a marca do fogão e qual é o problema específico?';
```
**Status:** ✅ OK - Já verifica `!brand && !problem`

---

#### 4. **Linha 2490** - Fallback de outros equipamentos (política)
```typescript
if (!marca2 && !problema2)
  return 'Antes de cotar: qual é a marca do equipamento e qual é o problema específico?';
```
**Status:** ✅ OK - Já verifica `!marca2 && !problema2`

---

#### 5. **Linha 2559** - Fallback de fogão a gás
```typescript
if (!marca && !problema)
  return 'Antes de te passar causas e valor: qual é a marca e qual é o problema específico do fogão?';
```
**Status:** ✅ OK - Já verifica `!marca && !problema`

---

#### 6. **Linha 2612** - Fallback de outros equipamentos
```typescript
if (!marca && !problema)
  return 'Antes de cotar: qual é a marca do equipamento e qual é o problema específico?';
```
**Status:** ✅ OK - Já verifica `!marca && !problema`

---

#### 7. **Linha 2886** - Fallback de equipamentos com mount
```typescript
if (!marca && !problemaText)
  return 'Antes do orçamento: me informe a marca e descreva o problema específico, por favor.';
```
**Status:** ✅ OK - Já verifica `!marca && !problemaText`

---

#### 8. **Linha 3538** - Modo de teste (saudação)
```typescript
if (!sd.equipamento || !sd.marca || !sd.problema) {
  out = 'Para te ajudar melhor: qual é o equipamento? Em seguida, me informe a marca do equipamento e o problema específico.';
```
**Status:** ✅ OK - Já verifica todos os dados

---

#### 9. **Linha 3869** - Modo de teste (orçamento)
```typescript
} else if (!hasEq || !hasBrand || !hasProb) {
  out = 'Para te ajudar melhor: qual é o equipamento? Em seguida, me informe a marca do equipamento e o problema específico.';
```
**Status:** ✅ OK - Já verifica todos os dados

---

#### 10. **Linha 4369** - executeAIOrçamento
```typescript
if (!dados.marca && !problema)
  return `${ack}Antes do orçamento: qual é a marca do equipamento e qual é o problema específico?`;
```
**Status:** ✅ OK - Já verifica `!dados.marca && !problema`

---

#### 11. **Linha 5483** - Equipamento industrial
```typescript
return 'Para equipamento comercial/industrial, me informe a marca e descreva o problema específico para calcular o orçamento.';
```
**Status:** ⚠️ **PRECISA CORREÇÃO** - NÃO verifica sessão antes de pedir

---

#### 12. **Linha 5519** - Modo de teste (fallback final)
```typescript
if (!sd.equipamento || !sd.marca || !sd.problema) {
  return 'Para te ajudar melhor: qual é o equipamento? Em seguida, me informe a marca do equipamento e o problema específico.';
```
**Status:** ✅ OK - Já verifica todos os dados

---

## 🎯 CONCLUSÃO

### ✅ Funcionando Corretamente: 11/12 (91.7%)

Todos os fallbacks principais estão verificando a sessão corretamente EXCETO:

### ❌ Precisa Correção: 1/12 (8.3%)

**Linha 5483 - Equipamento Industrial:**
- Não verifica se já tem marca e problema na sessão
- Sempre pede marca e problema, mesmo se já foram fornecidos
- **CORREÇÃO NECESSÁRIA:** Adicionar verificação de sessão

---

## 🔧 CORREÇÃO RECOMENDADA

### Linha 5483 - Equipamento Industrial

**Código Atual:**
```typescript
if (isIndustrial && (isForno || isFogao || isGeladeira)) {
  console.log('[LEGACY-ROUTER] 🏭 Equipamento industrial detectado!');

  let equipment = 'equipamento industrial';
  if (isForno) equipment = 'forno industrial';
  else if (isFogao) equipment = 'fogão industrial';
  else if (isGeladeira) equipment = 'geladeira comercial';

  // Em legado, não vamos orçar sem marca + problema: aplicar gate
  return 'Para equipamento comercial/industrial, me informe a marca e descreva o problema específico para calcular o orçamento.';
}
```

**Código Corrigido:**
```typescript
if (isIndustrial && (isForno || isFogao || isGeladeira)) {
  console.log('[LEGACY-ROUTER] 🏭 Equipamento industrial detectado!');

  let equipment = 'equipamento industrial';
  if (isForno) equipment = 'forno industrial';
  else if (isFogao) equipment = 'fogão industrial';
  else if (isGeladeira) equipment = 'geladeira comercial';

  // Verificar se já temos marca e problema na sessão
  const st = (((session as any)?.state) || {}) as any;
  const dadosColetados = (st.dados_coletados || {}) as any;
  const temMarca = !!dadosColetados.marca;
  const temProblema = !!(dadosColetados.problema || dadosColetados.descricao_problema);

  // Se já temos marca E problema, não retornar essa mensagem - deixar o fluxo continuar
  if (!temMarca || !temProblema) {
    return 'Para equipamento comercial/industrial, me informe a marca e descreva o problema específico para calcular o orçamento.';
  }
}
```

---

## 📋 PRÓXIMOS PASSOS

1. ✅ Aplicar correção na linha 5483
2. ✅ Compilar código
3. ✅ Fazer deploy no Railway
4. ✅ Executar bateria de testes
5. ✅ Verificar se todos os equipamentos estão funcionando corretamente

