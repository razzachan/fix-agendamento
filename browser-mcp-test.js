// Script para testar a funcionalidade do Browser MCP
const { connect } = require('@browsermcp/client');

async function testBrowserMCP() {
  try {
    // Conectar ao servidor do Browser MCP
    const browser = await connect({ host: 'localhost', port: 9009 });
    console.log('Conectado ao Browser MCP!');

    // Navegar para a página de ordens de serviço
    await browser.navigate('http://localhost:8080/orders');
    console.log('Navegou para a página de ordens de serviço');

    // Esperar a página carregar
    await browser.waitForSelector('.order-item', { timeout: 5000 });
    console.log('Página carregada com sucesso');

    // Capturar screenshot
    await browser.screenshot({ path: 'orders-page.png' });
    console.log('Screenshot capturado');

    // Clicar na primeira ordem de serviço
    await browser.click('.order-item:first-child');
    console.log('Clicou na primeira ordem de serviço');

    // Esperar a página de detalhes carregar
    await browser.waitForSelector('.order-details', { timeout: 5000 });
    console.log('Página de detalhes carregada com sucesso');

    // Verificar se a seção de garantia está presente
    const warrantySection = await browser.evaluate(() => {
      return !!document.querySelector('.warranty-section');
    });
    console.log('Seção de garantia presente:', warrantySection);

    // Capturar screenshot da página de detalhes
    await browser.screenshot({ path: 'order-details.png' });
    console.log('Screenshot da página de detalhes capturado');

    // Clicar no botão para avançar o status
    await browser.click('.next-status-button');
    console.log('Clicou no botão para avançar o status');

    // Verificar se a garantia foi ativada
    const warrantyActivated = await browser.evaluate(() => {
      return !!document.querySelector('.warranty-active');
    });
    console.log('Garantia ativada:', warrantyActivated);

    // Capturar screenshot final
    await browser.screenshot({ path: 'warranty-activated.png' });
    console.log('Screenshot final capturado');

    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
}

testBrowserMCP();
