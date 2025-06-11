// Script para testar a funcionalidade de garantia usando Browser MCP via API REST
import http from 'http';

// Função para enviar um comando para o Browser MCP
function sendCommand(command, params) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      command,
      params
    });

    const options = {
      hostname: 'localhost',
      port: 9009,
      path: '/api/command',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve(parsedData);
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Função para aguardar um tempo específico
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função principal para testar a funcionalidade de garantia
async function testWarrantyFeature() {
  try {
    console.log('Iniciando teste da funcionalidade de garantia...');

    // Navegar para a página de ordens de serviço
    console.log('Navegando para a página de ordens de serviço...');
    await sendCommand('navigate', { url: 'http://localhost:8080/orders' });
    await wait(2000);

    // Capturar snapshot da lista de ordens
    console.log('Capturando snapshot da lista de ordens...');
    await sendCommand('snapshot', { filename: 'orders-list.png' });

    // Listar todos os elementos clicáveis na página
    console.log('Listando elementos clicáveis na página...');
    const clickableElements = await sendCommand('evaluate', {
      script: `
        const elements = Array.from(document.querySelectorAll('a, button, [role="button"], .clickable'));
        return elements.map(el => ({
          tag: el.tagName,
          text: el.textContent.trim(),
          classes: el.className,
          id: el.id
        }));
      `
    });

    console.log('Elementos clicáveis encontrados:', JSON.stringify(clickableElements.result, null, 2));

    // Clicar na primeira ordem de serviço (se houver)
    console.log('Tentando clicar na primeira ordem de serviço...');
    await sendCommand('evaluate', {
      script: `
        const orderItems = document.querySelectorAll('.order-item, .service-order, tr, .card');
        if (orderItems.length > 0) {
          orderItems[0].click();
          return true;
        }
        return false;
      `
    });
    await wait(2000);

    // Capturar snapshot da página de detalhes
    console.log('Capturando snapshot da página de detalhes...');
    await sendCommand('snapshot', { filename: 'order-details.png' });

    // Listar todos os botões na página
    console.log('Listando todos os botões na página...');
    const buttons = await sendCommand('evaluate', {
      script: `
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn'));
        return buttons.map(btn => ({
          text: btn.textContent.trim(),
          classes: btn.className,
          id: btn.id,
          dataAttrs: Object.fromEntries(
            Array.from(btn.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => [attr.name, attr.value])
          )
        }));
      `
    });

    console.log('Botões encontrados:', JSON.stringify(buttons.result, null, 2));

    // Tentar clicar em um botão de avançar status (se houver)
    console.log('Tentando clicar em um botão de avançar status...');
    const statusButtonClicked = await sendCommand('evaluate', {
      script: `
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn'));
        const nextStatusButton = buttons.find(btn =>
          btn.textContent.includes('Avançar') ||
          btn.textContent.includes('Próximo') ||
          btn.textContent.includes('Concluir') ||
          btn.classList.contains('next-status-button')
        );

        if (nextStatusButton) {
          nextStatusButton.click();
          return true;
        }
        return false;
      `
    });

    console.log('Botão de avançar status clicado:', statusButtonClicked.result);
    await wait(2000);

    // Capturar snapshot após tentar avançar o status
    console.log('Capturando snapshot após tentar avançar o status...');
    await sendCommand('snapshot', { filename: 'after-status-update.png' });

    // Tentar clicar em um botão de ativar garantia (se houver)
    console.log('Tentando clicar em um botão de ativar garantia...');
    const warrantyButtonClicked = await sendCommand('evaluate', {
      script: `
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn'));
        const warrantyButton = buttons.find(btn =>
          btn.textContent.includes('Garantia') ||
          btn.textContent.includes('Ativar') ||
          btn.classList.contains('warranty-button')
        );

        if (warrantyButton) {
          warrantyButton.click();
          return true;
        }
        return false;
      `
    });

    console.log('Botão de ativar garantia clicado:', warrantyButtonClicked.result);
    await wait(1000);

    // Capturar snapshot após tentar ativar a garantia
    console.log('Capturando snapshot após tentar ativar a garantia...');
    await sendCommand('snapshot', { filename: 'after-warranty-button.png' });

    // Tentar clicar em um botão de confirmar (se houver)
    console.log('Tentando clicar em um botão de confirmar...');
    const confirmButtonClicked = await sendCommand('evaluate', {
      script: `
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn'));
        const confirmButton = buttons.find(btn =>
          btn.textContent.includes('Confirmar') ||
          btn.textContent.includes('OK') ||
          btn.classList.contains('confirm-button')
        );

        if (confirmButton) {
          confirmButton.click();
          return true;
        }
        return false;
      `
    });

    console.log('Botão de confirmar clicado:', confirmButtonClicked.result);
    await wait(2000);

    // Capturar snapshot após tentar confirmar
    console.log('Capturando snapshot após tentar confirmar...');
    await sendCommand('snapshot', { filename: 'after-confirm.png' });

    // Voltar para a lista de ordens
    console.log('Tentando voltar para a lista de ordens...');
    const backButtonClicked = await sendCommand('evaluate', {
      script: `
        const buttons = Array.from(document.querySelectorAll('a, button, [role="button"], .btn'));
        const backButton = buttons.find(btn =>
          btn.textContent.includes('Voltar') ||
          btn.textContent.includes('Lista') ||
          btn.classList.contains('back-button') ||
          btn.href && btn.href.includes('/orders')
        );

        if (backButton) {
          backButton.click();
          return true;
        }
        return false;
      `
    });

    console.log('Botão de voltar clicado:', backButtonClicked.result);
    await wait(1000);

    // Capturar snapshot após voltar para a lista
    console.log('Capturando snapshot após voltar para a lista...');
    await sendCommand('snapshot', { filename: 'back-to-list.png' });

    // Tentar criar uma nova ordem
    console.log('Tentando criar uma nova ordem...');
    const newOrderButtonClicked = await sendCommand('evaluate', {
      script: `
        const buttons = Array.from(document.querySelectorAll('a, button, [role="button"], .btn'));
        const newOrderButton = buttons.find(btn =>
          btn.textContent.includes('Nova') ||
          btn.textContent.includes('Criar') ||
          btn.textContent.includes('Adicionar') ||
          btn.classList.contains('new-order-button')
        );

        if (newOrderButton) {
          newOrderButton.click();
          return true;
        }
        return false;
      `
    });

    console.log('Botão de nova ordem clicado:', newOrderButtonClicked.result);
    await wait(1000);

    // Capturar snapshot do formulário de nova ordem
    console.log('Capturando snapshot do formulário de nova ordem...');
    await sendCommand('snapshot', { filename: 'new-order-form.png' });

    console.log('Teste da funcionalidade de garantia concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
}

// Executar o teste
testWarrantyFeature();
