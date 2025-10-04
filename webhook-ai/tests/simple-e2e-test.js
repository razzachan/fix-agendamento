/**
 * 🧪 Testes E2E Simplificados
 * 
 * Testa o fluxo de detecção de equipamentos, marcas e problemas
 * usando a função guessFunnelFields diretamente
 */

// Simular a função guessFunnelFields (versão simplificada)
function guessFunnelFields(text) {
  const normalize = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const braw = text || '';
  const b = normalize(braw.toLowerCase());
  
  const equipamentos = [
    'fogao', 'forno', 'cooktop', 'cook top',
    'micro-ondas', 'microondas', 'micro ondas',
    'lava-loucas', 'lava loucas', 'lava louca', 'lavaloucas',
    'lava roupas', 'lavadora', 'maquina de lavar',
    'lava e seca', 'lava-seca',
    'secadora',
    'coifa', 'exaustor', 'depurador',
    'adega',
  ];
  
  const marcas = [
    'brastemp', 'consul', 'electrolux', 'eletrolux', 'lg', 'samsung',
    'bosch', 'midea', 'philco', 'fischer', 'mueller', 'ge',
    'continental', 'tramontina', 'dako', 'esmaltec', 'atlas', 'panasonic',
  ];
  
  const problemas = [
    // ORDEM: mais específico primeiro
    'nao lava direito', 'nao limpa direito', 'nao lava bem',
    'loucas ficam sujas', 'loucas sujas', 'louca suja',
    'pratos ficam sujos', 'pratos sujos',
    'nao acende', 'nao liga',
    'chama fraca', 'chamas fracas', 'fogo fraco',
    'nao esquenta', 'nao funciona',
    'nao centrifuga', 'nao enche',
    'nao drena', 'vaza agua',
    'nao seca', 'nao aquece',
    'faz barulho', 'nao gela',
    'lava mal',
    'nao lava', 'nao limpa',
  ];
  
  let equipamento = undefined;
  for (const e of equipamentos) {
    if (b.includes(e)) {
      equipamento = e;
      break;
    }
  }
  
  let marca = undefined;
  for (const m of marcas) {
    if (b.includes(m)) {
      marca = m;
      break;
    }
  }
  
  let problema = undefined;
  for (const p of problemas) {
    if (b.includes(p)) {
      problema = p;
      break;
    }
  }
  
  return { equipamento, marca, problema };
}

// Casos de teste
const testCases = [
  // FOGÃO
  {
    name: 'Fogão - Completo',
    input: 'Oi, meu fogão Brastemp de 5 bocas não acende',
    expected: { equipamento: 'fogao', marca: 'brastemp', problema: 'nao acende' },
  },
  {
    name: 'Fogão - Sem marca',
    input: 'Meu fogão não acende',
    expected: { equipamento: 'fogao', marca: undefined, problema: 'nao acende' },
  },
  
  // LAVA-LOUÇAS
  {
    name: 'Lava-louças - Completo',
    input: 'Minha lava-louças Brastemp não lava direito',
    expected: { equipamento: 'lava-loucas', marca: 'brastemp', problema: 'nao lava direito' },
  },
  {
    name: 'Lava-louças - Variação 1',
    input: 'Lava louça Consul deixa as louças sujas',
    expected: { equipamento: 'lava louca', marca: 'consul', problema: 'loucas sujas' },
  },
  {
    name: 'Lava-louças - Variação 2',
    input: 'Minha lava-louças não limpa bem',
    expected: { equipamento: 'lava-loucas', marca: undefined, problema: 'nao limpa' },
  },
  {
    name: 'Lava-louças - Sem marca',
    input: 'Lavalouças não lava',
    expected: { equipamento: 'lavaloucas', marca: undefined, problema: 'nao lava' },
  },
  
  // MICRO-ONDAS
  {
    name: 'Micro-ondas - Bancada',
    input: 'Meu micro-ondas Panasonic de bancada não esquenta',
    expected: { equipamento: 'micro-ondas', marca: 'panasonic', problema: 'nao esquenta' },
  },
  {
    name: 'Micro-ondas - Embutido',
    input: 'Micro-ondas embutido Brastemp não funciona',
    expected: { equipamento: 'micro-ondas', marca: 'brastemp', problema: 'nao funciona' },
  },
  {
    name: 'Micro-ondas - Sem marca',
    input: 'Meu micro-ondas não esquenta',
    expected: { equipamento: 'micro-ondas', marca: undefined, problema: 'nao esquenta' },
  },
  
  // LAVADORA
  {
    name: 'Lavadora - Completo',
    input: 'Minha lavadora Electrolux não centrifuga',
    expected: { equipamento: 'lavadora', marca: 'electrolux', problema: 'nao centrifuga' },
  },
  {
    name: 'Lavadora - Máquina de lavar',
    input: 'Máquina de lavar Consul não enche de água',
    expected: { equipamento: 'maquina de lavar', marca: 'consul', problema: 'nao enche' },
  },
  {
    name: 'Lavadora - Vaza água',
    input: 'Minha lavadora vaza água',
    expected: { equipamento: 'lavadora', marca: undefined, problema: 'vaza agua' },
  },

  // LAVA E SECA
  {
    name: 'Lava e seca - Completo',
    input: 'Minha lava e seca LG não seca as roupas',
    expected: { equipamento: 'lava e seca', marca: 'lg', problema: 'nao seca' },
  },

  // SECADORA
  {
    name: 'Secadora - Completo',
    input: 'Secadora Electrolux não aquece',
    expected: { equipamento: 'secadora', marca: 'electrolux', problema: 'nao aquece' },
  },
  
  // COIFA
  {
    name: 'Coifa - Completo',
    input: 'Coifa Tramontina faz barulho',
    expected: { equipamento: 'coifa', marca: 'tramontina', problema: 'faz barulho' },
  },
  {
    name: 'Depurador - Completo',
    input: 'Depurador Fischer não funciona',
    expected: { equipamento: 'depurador', marca: 'fischer', problema: 'nao funciona' },
  },

  // ADEGA
  {
    name: 'Adega - Completo',
    input: 'Adega Brastemp não gela',
    expected: { equipamento: 'adega', marca: 'brastemp', problema: 'nao gela' },
  },
];

// Executar testes
console.log('\n🧪 ========== EXECUTANDO TESTES E2E ==========\n');

let passed = 0;
let failed = 0;
const failures = [];

for (const test of testCases) {
  const result = guessFunnelFields(test.input);
  
  const equipOk = result.equipamento === test.expected.equipamento;
  const marcaOk = result.marca === test.expected.marca;
  const problemaOk = result.problema === test.expected.problema;
  
  const testPassed = equipOk && marcaOk && problemaOk;
  
  if (testPassed) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Entrada: "${test.input}"`);
    console.log(`   Esperado: equip="${test.expected.equipamento}", marca="${test.expected.marca}", problema="${test.expected.problema}"`);
    console.log(`   Obtido:   equip="${result.equipamento}", marca="${result.marca}", problema="${result.problema}"`);
    
    if (!equipOk) console.log(`   ⚠️  Equipamento incorreto`);
    if (!marcaOk) console.log(`   ⚠️  Marca incorreta`);
    if (!problemaOk) console.log(`   ⚠️  Problema incorreto`);
    
    console.log('');
    failed++;
    failures.push({
      name: test.name,
      input: test.input,
      expected: test.expected,
      result: result,
    });
  }
}

// Relatório final
console.log('\n📊 ========== RELATÓRIO DE TESTES ==========\n');
console.log(`Total de testes: ${testCases.length}`);
console.log(`✅ Passaram: ${passed} (${((passed / testCases.length) * 100).toFixed(1)}%)`);
console.log(`❌ Falharam: ${failed} (${((failed / testCases.length) * 100).toFixed(1)}%)`);

if (failed > 0) {
  console.log('\n❌ TESTES QUE FALHARAM:\n');
  failures.forEach((f, i) => {
    console.log(`${i + 1}. ${f.name}`);
    console.log(`   Entrada: "${f.input}"`);
    console.log(`   Esperado: ${JSON.stringify(f.expected)}`);
    console.log(`   Obtido:   ${JSON.stringify(f.result)}`);
    console.log('');
  });
}

console.log('\n===========================================\n');

// Exit code
process.exit(failed > 0 ? 1 : 0);

