import fs from 'fs';
import fetch from 'node-fetch';

console.log('🔄 Atualizando tabela price_list...\n');

try {
  // Ler o arquivo JSON
  const priceListData = JSON.parse(fs.readFileSync('scripts/price_list_payload.json', 'utf8'));
  
  console.log('📋 Dados a serem enviados:');
  priceListData.items.forEach(item => {
    console.log(`   ${item.service_type}: R$ ${item.base} (${item.notes})`);
  });
  
  // Enviar para a API
  const response = await fetch('http://localhost:3001/api/price_list/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(priceListData)
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('\n✅ Tabela price_list atualizada com sucesso!');
    console.log('📊 Resultado:', result);
  } else {
    console.error('\n❌ Erro ao atualizar:', response.status, response.statusText);
    const errorText = await response.text();
    console.error('Detalhes:', errorText);
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}

process.exit(0);
