/**
 * =====================================================
 * TESTE DAS FAIXAS DINÂMICAS
 * =====================================================
 * Script para testar se as faixas dinâmicas funcionam
 * =====================================================
 */

// Simular dados de teste
const testOrders = [
  { final_cost: 350 },
  { final_cost: 450 },
  { final_cost: 650 },
  { final_cost: 850 },
  { final_cost: 1200 },
  { final_cost: 1500 },
  { final_cost: 2000 },
  { final_cost: 2500 },
  { final_cost: 3000 }
];

// Função para calcular faixas dinâmicas (versão simplificada)
function calculateDynamicValueRanges(orders) {
  if (!orders || orders.length === 0) {
    return {
      baixo_valor: { min: 0, max: 299 },
      medio_valor: { min: 300, max: 799 },
      alto_valor: { min: 800, max: Infinity }
    };
  }

  // Extrair valores reais de final_cost
  const values = orders
    .map(order => parseFloat(order.final_cost?.toString() || '0'))
    .filter(value => value > 0)
    .sort((a, b) => a - b);

  if (values.length < 10) {
    return {
      baixo_valor: { min: 0, max: 299 },
      medio_valor: { min: 300, max: 799 },
      alto_valor: { min: 800, max: Infinity }
    };
  }

  // Calcular percentis para faixas dinâmicas (33% e 66%)
  const p33Index = Math.floor(values.length * 0.33);
  const p66Index = Math.floor(values.length * 0.66);
  
  const p33Value = values[p33Index];
  const p66Value = values[p66Index];

  return {
    baixo_valor: { min: 0, max: p33Value - 0.01 },
    medio_valor: { min: p33Value, max: p66Value - 0.01 },
    alto_valor: { min: p66Value, max: Infinity }
  };
}

// Executar teste
console.log('🎯 TESTE DAS FAIXAS DINÂMICAS');
console.log('============================');

const ranges = calculateDynamicValueRanges(testOrders);

console.log('📊 Dados de teste:', testOrders.map(o => o.final_cost));
console.log('📊 Faixas calculadas:', {
  baixo: `R$ ${ranges.baixo_valor.min} - R$ ${ranges.baixo_valor.max.toFixed(2)}`,
  medio: `R$ ${ranges.medio_valor.min} - R$ ${ranges.medio_valor.max.toFixed(2)}`,
  alto: `R$ ${ranges.alto_valor.min}+`
});

// Testar categorização
function getValueCategory(value, ranges) {
  if (value >= ranges.alto_valor.min) {
    return 'alto_valor';
  } else if (value >= ranges.medio_valor.min) {
    return 'medio_valor';
  } else {
    return 'baixo_valor';
  }
}

console.log('\n🎯 TESTE DE CATEGORIZAÇÃO:');
const testValues = [300, 600, 900, 1500, 2500];
testValues.forEach(value => {
  const category = getValueCategory(value, ranges);
  console.log(`R$ ${value} → ${category}`);
});

console.log('\n✅ TESTE CONCLUÍDO!');
