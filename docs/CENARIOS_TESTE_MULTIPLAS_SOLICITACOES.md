# 🧪 CENÁRIOS DE TESTE: MÚLTIPLAS SOLICITAÇÕES

**Relacionado:** [ANALISE_PRE_AGENDAMENTOS_MULTIPLAS_SOLICITACOES.md](./ANALISE_PRE_AGENDAMENTOS_MULTIPLAS_SOLICITACOES.md)

## 📋 CENÁRIOS DE TESTE ATUAIS

### Cenário 1: Equipamentos Homogêneos (Funciona Bem)
```json
{
  "nome": "Maria Santos",
  "endereco": "Av. Brasil, 456",
  "equipamentos": ["Fogão", "Cooktop"],
  "problemas": ["Não acende", "Queimador entupido"],
  "tipo_atual": "em_domicilio"
}
```
**Resultado Atual:** ✅ 1 OS com 2 equipamentos domicílio  
**Eficiência:** Alta - Técnico resolve tudo em 1 visita

### Cenário 2: Equipamentos Heterogêneos (Problemático)
```json
{
  "nome": "João Silva", 
  "endereco": "Rua das Flores, 123",
  "equipamentos": ["Geladeira", "Microondas"],
  "problemas": ["Não gela", "Display quebrado"],
  "tipo_forçado": "coleta_diagnostico"
}
```
**Resultado Atual:** ❌ 1 OS coleta para ambos  
**Problema:** Geladeira poderia ser resolvida em domicílio  
**Desperdício:** Transporte desnecessário da geladeira

### Cenário 3: Múltiplos Equipamentos Mistos (Muito Problemático)
```json
{
  "nome": "Carlos Oliveira",
  "endereco": "Rua Central, 789", 
  "equipamentos": ["Fogão", "Geladeira", "Microondas"],
  "problemas": ["Forno não funciona", "Ruído estranho", "Não liga"],
  "tipo_forçado": "em_domicilio"
}
```
**Resultado Atual:** ❌ 1 OS domicílio para todos  
**Problema:** Microondas precisaria de diagnóstico na oficina  
**Ineficiência:** Técnico não consegue resolver tudo no local

## 🎯 CENÁRIOS DE TESTE PROPOSTOS (VERSÃO 2.0)

### Cenário A: Otimização Inteligente
```json
{
  "nome": "Ana Costa",
  "endereco": "Rua Nova, 321",
  "equipamentos": ["Fogão", "Geladeira", "Lava-louças"],
  "problemas": ["Não acende", "Não gela", "Não drena"],
  "tipos_atendimento": ["coleta_diagnostico", "em_domicilio", "em_domicilio"]
}
```
**Resultado Esperado:** 
- OS #001: Geladeira + Lava-louças (domicílio)
- OS #002: Fogão (coleta)
**Benefício:** Técnico resolve 2 equipamentos no local, coleta apenas 1

### Cenário B: Agrupamento por Compatibilidade
```json
{
  "nome": "Pedro Alves",
  "endereco": "Av. Paulista, 1000",
  "equipamentos": ["Microondas", "Forno elétrico", "Cooktop"],
  "problemas": ["Display", "Resistência", "Não acende"],
  "tipos_atendimento": ["coleta_conserto", "coleta_conserto", "em_domicilio"]
}
```
**Resultado Esperado:**
- OS #001: Cooktop (domicílio)
- OS #002: Microondas + Forno (coleta conserto)
**Benefício:** Otimização da oficina e logística

### Cenário C: Priorização por Urgência
```json
{
  "nome": "Lucia Ferreira",
  "endereco": "Rua Urgente, 555",
  "equipamentos": ["Geladeira", "Freezer"],
  "problemas": ["Não gela - URGENTE", "Ruído normal"],
  "tipos_atendimento": ["em_domicilio", "coleta_diagnostico"],
  "urgente": true
}
```
**Resultado Esperado:**
- OS #001: Geladeira (domicílio, URGENTE)
- OS #002: Freezer (coleta, normal)
**Benefício:** Priorização correta por urgência

## 🔬 CASOS DE TESTE TÉCNICOS

### Teste 1: Validação de Entrada
```typescript
describe('Validação de Múltiplas Solicitações', () => {
  test('Deve aceitar equipamentos com tipos diferentes', () => {
    const input = {
      equipamentos: ['Fogão', 'Geladeira'],
      tipos_atendimento: ['coleta_diagnostico', 'em_domicilio']
    };
    expect(validateMultipleRequest(input)).toBe(true);
  });

  test('Deve rejeitar arrays de tamanhos diferentes', () => {
    const input = {
      equipamentos: ['Fogão', 'Geladeira'],
      tipos_atendimento: ['coleta_diagnostico'] // Faltando 1
    };
    expect(validateMultipleRequest(input)).toBe(false);
  });
});
```

### Teste 2: Algoritmo de Agrupamento
```typescript
describe('Agrupamento de Equipamentos', () => {
  test('Deve agrupar equipamentos do mesmo tipo', () => {
    const input = {
      equipamentos: ['Fogão', 'Geladeira', 'Cooktop'],
      tipos_atendimento: ['em_domicilio', 'coleta_diagnostico', 'em_domicilio']
    };
    
    const result = groupEquipmentsByType(input);
    
    expect(result).toHaveLength(2);
    expect(result[0].equipamentos).toEqual(['Fogão', 'Cooktop']);
    expect(result[1].equipamentos).toEqual(['Geladeira']);
  });
});
```

### Teste 3: Criação de Múltiplas OS
```typescript
describe('Criação de Ordens de Serviço', () => {
  test('Deve criar múltiplas OS corretamente', async () => {
    const preAgendamento = {
      id: 'AG001',
      equipamentos: ['Fogão', 'Geladeira'],
      tipos_atendimento: ['coleta_diagnostico', 'em_domicilio']
    };
    
    const result = await createMultipleOrdersFromSchedule(preAgendamento);
    
    expect(result.orders).toHaveLength(2);
    expect(result.orders[0].serviceAttendanceType).toBe('coleta_diagnostico');
    expect(result.orders[1].serviceAttendanceType).toBe('em_domicilio');
  });
});
```

## 📊 MÉTRICAS DE TESTE

### KPIs de Eficiência
- **Redução de viagens:** Medir antes/depois da implementação
- **Utilização da oficina:** % de equipamentos que realmente precisam ir
- **Tempo médio de resolução:** Por tipo de atendimento
- **Satisfação do cliente:** Pesquisa pós-atendimento

### Métricas Técnicas
- **Performance:** Tempo de criação de múltiplas OS
- **Consistência:** Integridade dos dados entre OS relacionadas
- **Rastreabilidade:** Capacidade de vincular OS ao pré-agendamento original

## 🎭 PERSONAS DE TESTE

### Admin Experiente (Maria)
- **Perfil:** 2 anos usando o sistema
- **Expectativa:** Interface intuitiva para decisões rápidas
- **Teste:** Consegue processar 10 pré-agendamentos em 15 minutos

### Técnico Veterano (João)
- **Perfil:** 5 anos de experiência
- **Expectativa:** Rotas otimizadas e informações claras
- **Teste:** Consegue completar rota com 80% menos viagens

### Oficina Pequena (Carlos)
- **Perfil:** Espaço limitado, 2 bancadas
- **Expectativa:** Receber apenas equipamentos necessários
- **Teste:** Redução de 50% no tempo de triagem

## 🚀 PLANO DE TESTES

### Fase 1: Testes Unitários (2 dias)
- [ ] Validação de entrada de dados
- [ ] Algoritmos de agrupamento
- [ ] Criação de múltiplas OS

### Fase 2: Testes de Integração (3 dias)
- [ ] Fluxo completo pré-agendamento → OS
- [ ] Integração com roteirização
- [ ] Sincronização de status

### Fase 3: Testes de Usuário (5 dias)
- [ ] Teste com admin real
- [ ] Teste com técnico em campo
- [ ] Teste com oficina parceira

### Fase 4: Testes de Performance (2 dias)
- [ ] Carga com 100 pré-agendamentos simultâneos
- [ ] Tempo de resposta da interface
- [ ] Uso de memória e CPU

## 📋 CHECKLIST DE VALIDAÇÃO

### ✅ Funcionalidade Básica
- [ ] Sistema aceita múltiplos tipos de atendimento
- [ ] Cria OS separadas quando necessário
- [ ] Mantém rastreabilidade do pré-agendamento

### ✅ Otimização
- [ ] Agrupa equipamentos compatíveis
- [ ] Reduz viagens desnecessárias
- [ ] Otimiza uso da oficina

### ✅ Usabilidade
- [ ] Interface intuitiva para admin
- [ ] Informações claras para técnico
- [ ] Processo simplificado para oficina

### ✅ Performance
- [ ] Tempo de resposta < 2 segundos
- [ ] Suporta 50+ pré-agendamentos simultâneos
- [ ] Não degrada performance do sistema

---

**Documento criado em:** Janeiro 2025  
**Versão:** 1.0  
**Status:** Pronto para implementação
