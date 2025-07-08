# 🚀 SISTEMA DE LOGÍSTICA INTELIGENTE - FIX FOGÕES

## 📋 VISÃO GERAL

O Sistema de Logística Inteligente é responsável por otimizar o agendamento de técnicos baseado em:
- **Localização geográfica** (grupos A, B, C)
- **Otimização de rotas** e deslocamentos
- **Disponibilidade real** dos técnicos
- **Urgência** do atendimento
- **Agrupamento estratégico** de agendamentos

---

## 🗺️ GRUPOS LOGÍSTICOS

### 🏙️ GRUPO A - FLORIANÓPOLIS CENTRO
- **Raio:** Até 15km do centro de Florianópolis
- **Características:** Trânsito urbano intenso
- **Estratégia:** Otimização por horários de menor trânsito

**Horários Prioritários:**
1. **9h-10h** (Score: 20) - Manhã ideal, menos trânsito
2. **10h-11h** (Score: 18) - Manhã boa
3. **14h-15h** (Score: 15) - Tarde boa, pós-almoço
4. **15h-16h** (Score: 12) - Tarde ok
5. **13h-14h** (Score: 10) - Início da tarde
6. **16h-17h** (Score: 8) - Final da tarde

### 🌆 GRUPO B - GRANDE FLORIANÓPOLIS
- **Raio:** 15km a 30km do centro
- **Características:** Região metropolitana
- **Estratégia:** Balanceamento entre grupos A e C

**Horários Prioritários:**
1. **14h-15h** (Score: 20) - Tarde ideal
2. **13h-14h** (Score: 18) - Pós-almoço
3. **15h-16h** (Score: 16) - Tarde boa
4. **10h-11h** (Score: 14) - Manhã boa
5. **9h-10h** (Score: 12) - Manhã ok
6. **16h-17h** (Score: 10) - Final da tarde

### 🏖️ GRUPO C - ROTA SEQUENCIAL LITORAL
- **Raio:** Acima de 30km (BC, Itajaí, Navegantes, etc.)
- **Características:** Distâncias longas, agrupamento obrigatório
- **Estratégia:** Rota sequencial otimizada

**Rota Sequencial:**
- **MANHÃ:** Tijucas (35km) → Itapema (55km)
- **TARDE:** Balneário Camboriú (75km) → Itajaí (95km) → Navegantes (105km)

---

## ⚙️ ALGORITMO DE OTIMIZAÇÃO

### 1. 🎯 DETECÇÃO DE GRUPO LOGÍSTICO

```python
def determine_logistics_group(endereco: str, coordenadas: Tuple[float, float]) -> str:
    # 1. Geocodificação do endereço
    # 2. Cálculo da distância do centro de Florianópolis
    # 3. Classificação em grupos A, B ou C
```

**Critérios:**
- **Coordenadas:** Latitude/Longitude via Nominatim
- **Distância:** Cálculo haversine do centro de Floripa
- **Fallback:** Análise por CEP se geocodificação falhar

### 2. 🔍 VERIFICAÇÃO DE DISPONIBILIDADE

```python
async def verificar_horario_tecnico_disponivel(technician_id: str, date_str: str, hour: int) -> bool:
    # 1. Verificar conflitos em service_orders
    # 2. Verificar conflitos em agendamentos_ai
    # 3. Aplicar filtros de horário comercial (9h-11h, 13h-17h)
```

**Verificações:**
- ✅ **Service Orders:** Agendamentos confirmados
- ✅ **Agendamentos AI:** Pré-agendamentos pendentes
- ✅ **Horário Comercial:** Segunda a sexta, 9h-17h (exceto 11h-13h)
- ✅ **Filtro de Data:** Comparação correta DATETIME vs DATE

### 3. 📊 SISTEMA DE SCORING

**Score Base por Horário:**
- Cada grupo tem prioridades diferentes
- Horários ideais recebem scores mais altos
- Sistema prioriza datas mais próximas

**Bônus Aplicados:**
- **+15 pontos:** Urgência
- **+5-10 pontos:** Proximidade geográfica
- **+10 pontos:** Agrupamento no mesmo dia
- **+5 pontos:** Otimização de rota

### 4. 🎯 ESTRATÉGIAS POR GRUPO

#### 🏙️ Estratégia Grupo A
```python
async def estrategia_grupo_a():
    # Prioriza manhã (menos trânsito urbano)
    # Evita horários de rush (17h+)
    # Otimização por trânsito urbano
```

#### 🌆 Estratégia Grupo B
```python
async def estrategia_grupo_b():
    # Balanceamento entre manhã e tarde
    # Flexibilidade para otimizar rotas
    # Prioriza tarde (13h-16h)
```

#### 🏖️ Estratégia Grupo C
```python
async def estrategia_grupo_c():
    # Rota sequencial obrigatória
    # Agrupamento no mesmo dia
    # Tijucas/Itapema: manhã
    # BC/Itajaí/Navegantes: tarde
```

---

## 🔄 FLUXO DE EXECUÇÃO

### ETAPA 1 - CONSULTA DE HORÁRIOS

1. **Recebe dados do cliente**
2. **Geocodifica endereço** (com cache)
3. **Determina grupo logístico**
4. **Seleciona técnico otimizado**
5. **Aplica estratégia específica do grupo**
6. **Verifica disponibilidade real**
7. **Calcula scores de otimização**
8. **Retorna 3 melhores opções**
9. **Salva no cache para ETAPA 2**

### ETAPA 2 - CONFIRMAÇÃO

1. **Detecta escolha do cliente**
2. **Recupera dados do cache**
3. **Valida horário ainda disponível**
4. **Cria Ordem de Serviço**
5. **Atualiza disponibilidade**
6. **Retorna confirmação estruturada**

---

## 🛡️ VALIDAÇÕES E SEGURANÇA

### Horários Comerciais
- **Permitidos:** 9h-11h e 13h-17h
- **Bloqueados:** Antes de 9h, 11h-13h (almoço), após 17h
- **Dias:** Segunda a sexta (sem fins de semana)

### Verificação de Conflitos
```sql
-- Verificação correta de conflitos
SELECT COUNT(*) FROM service_orders 
WHERE technician_id = ? 
AND scheduled_date::date = ? 
AND scheduled_time = ?
```

### Cache de Geocodificação
- **TTL:** 1 hora
- **Normalização:** Endereços padronizados
- **Performance:** Evita múltiplas consultas Nominatim

---

## 📈 MÉTRICAS DE OTIMIZAÇÃO

### Scores de Priorização
- **Score Base:** 8-20 pontos (por horário)
- **Urgência:** +15 pontos
- **Proximidade:** +1-5 pontos
- **Agrupamento:** +10 pontos
- **Rota:** +5 pontos

### Algoritmo de Seleção
1. **Ordena por score total** (maior primeiro)
2. **Prioriza datas mais próximas**
3. **Limita a 3 opções**
4. **Garante diversidade de horários**

---

## 🔧 CONFIGURAÇÕES

### Constantes Geográficas
```python
FLORIANOPOLIS_CENTER = (-48.5482, -27.5954)
GROUP_A_RADIUS = 15  # km
GROUP_B_RADIUS = 30  # km
```

### Horários Comerciais
```python
HORA_INICIO_MANHA = 9    # 9h
HORA_FIM_MANHA = 11      # 11h
HORA_INICIO_TARDE = 13   # 13h
HORA_FIM_TARDE = 17      # 17h
```

### Cache e Performance
```python
GEOCODING_CACHE_TTL = 3600  # 1 hora
MAX_DIAS_VERIFICACAO = 15   # dias úteis
MAX_HORARIOS_RETORNO = 3    # opções
```

---

## 🚨 CORREÇÕES IMPLEMENTADAS

### Problema: Concentração de Horários
- **Causa:** Verificação de disponibilidade falhava
- **Solução:** Correção na comparação DATETIME vs DATE
- **Resultado:** Distribuição correta de horários

### Problema: Erro 499 (Timeout)
- **Causa:** Múltiplas geocodificações lentas
- **Solução:** Cache de geocodificação
- **Resultado:** Performance otimizada

### Problema: Dados Inconsistentes
- **Causa:** Cache entre etapas não sincronizado
- **Solução:** Sistema de cache robusto
- **Resultado:** Dados consistentes entre ETAPA 1 e 2

---

## 📊 EXEMPLO DE RESPOSTA

```json
{
  "horarios_disponiveis": [
    {
      "numero": 1,
      "texto": "Previsão de chegada entre 10h e 11h - Quarta-feira, 09/07/2025",
      "datetime_agendamento": "2025-07-09T10:00:00-03:00",
      "score_otimizacao": 64,
      "grupo_logistico": "C"
    }
  ],
  "tecnico": "Paulo Cesar Betoni",
  "urgente": false,
  "action": "select_time"
}
```

---

*Documentação atualizada em: Julho 2025*
*Sistema: Fix Fogões v3.1.0*
