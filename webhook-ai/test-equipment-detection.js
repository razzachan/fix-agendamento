// Teste para verificar se a detecção de equipamentos está funcionando

// Função copiada do conversationOrchestrator.ts para teste
function guessFunnelFields(text) {
  const b = (text||'').toLowerCase();
  const equipamentos = [
    // Fogão / Forno
    'fogão','fogao',
    'forno','forno elétrico','forno eletrico','forno a gás','forno a gas','forno de embutir','forno embutir',
    // Cooktop
    'cooktop','cook top','cook-top',
    // Micro-ondas
    'micro-ondas','microondas','micro ondas','forno microondas','forno micro-ondas','forno de microondas',
    // Lava-louças (variações sing/plural, com/sem hífen e cedilha)
    'lava louças','lava-louças','lava louça','lava-louça','lava-louca','lava louca',
    'lavalouças','lavalouça','lava loucas','lava-loucas','lavaloucas','lavalouca',
    'máquina de lavar louças','maquina de lavar loucas','máquina lavar louças','maquina lavar loucas',
    // Lava-roupas / Lavadora
    'lava roupas','lava-roupas','lava roupa','lava-roupa','lavaroupas','lavaroupa',
    'lavadora','lavadora de roupas','máquina de lavar roupas','maquina de lavar roupas','máquina de lavar','maquina de lavar',
    // Lava e seca
    'lava e seca','lava-e-seca','lavadora e secadora',
    // Secadora
    'secadora','secadora de roupas',
    // Coifa
    'coifa','exaustor','depurador',
    // Adega
    'adega','adega climatizada','adega de vinhos','adega de vinho'
  ];

  let equipamentosEncontrados = [];
  for (const eq of equipamentos){
    if (b.includes(eq)) {
      equipamentosEncontrados.push(eq);
    }
  }

  // Marcas conhecidas
  const marcas = ['electrolux','brastemp','consul','fischer','continental','atlas','dako','suggar','midea','philco','ge','bosch','whirlpool'];
  let marca;
  for (const m of marcas){ if (b.includes(m)) { marca = m; break; } }

  // Problemas comuns
  const problemas = ['não liga','nao liga','não acende','nao acende','não esquenta','nao esquenta','não funciona','nao funciona','não entra água','nao entra agua','vazando','barulho','ruído'];
  let problema;
  for (const p of problemas){ if (b.includes(p)) { problema = p; break; } }

  // Detectar total de bocas (4/5/6) do equipamento (não confundir com bocas com defeito)
  let num_burners;
  const m = b.match(/(?:\b|^)(4|5|6)\s*bocas?\b/);
  if (m) {
    num_burners = m[1];
  } else {
    const words = { 'quatro':'4', 'cinco':'5', 'seis':'6' };
    for (const [w,n] of Object.entries(words)){
      if (b.includes(`${w} bocas`) || b.includes(`${w} boca`)) { num_burners = n; break; }
    }
  }

  // Retornar primeiro equipamento para compatibilidade, mas também a lista completa
  const equipamento = equipamentosEncontrados[0];
  return { equipamento, equipamentosEncontrados, marca, problema, num_burners };
}

console.log('🧪 TESTE: Detecção de Equipamentos');
console.log('=====================================');

// Teste 1: Micro-ondas
const teste1 = guessFunnelFields('Micro-ondas não esquenta');
console.log('\n1. "Micro-ondas não esquenta"');
console.log('   Resultado:', teste1);
console.log('   ✅ Esperado: equipamento = "micro-ondas"');
console.log('   🎯 Atual:', teste1.equipamento);

// Teste 2: Lavadora
const teste2 = guessFunnelFields('Minha lavadora Electrolux não está funcionando');
console.log('\n2. "Minha lavadora Electrolux não está funcionando"');
console.log('   Resultado:', teste2);
console.log('   ✅ Esperado: equipamento = "lavadora"');
console.log('   🎯 Atual:', teste2.equipamento);

// Teste 3: Lava-louças
const teste3 = guessFunnelFields('Consertam máquina de lavar louças? Não entra água');
console.log('\n3. "Consertam máquina de lavar louças? Não entra água"');
console.log('   Resultado:', teste3);
console.log('   ✅ Esperado: equipamento = "lava-louças"');
console.log('   🎯 Atual:', teste3.equipamento);

// Teste 4: Geladeira (não deveria detectar)
const teste4 = guessFunnelFields('Geladeira não gela');
console.log('\n4. "Geladeira não gela"');
console.log('   Resultado:', teste4);
console.log('   ✅ Esperado: equipamento = undefined (não atendemos)');
console.log('   🎯 Atual:', teste4.equipamento);

console.log('\n=====================================');
console.log('🏁 TESTE CONCLUÍDO');
