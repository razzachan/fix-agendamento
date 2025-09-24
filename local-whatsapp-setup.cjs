const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

console.log('🚀 Configurador Local do WhatsApp para Railway');
console.log('Este script vai gerar o QR code localmente e preparar a sessão para o Railway');

// Configuração local
const client = new Client({
  authStrategy: new LocalAuth({ 
    clientId: 'fixbot-v2',
    dataPath: './local-wa-session'
  }),
  puppeteer: {
    headless: false, // Mostrar browser para debug
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ]
  }
});

client.on('qr', (qr) => {
  console.log('📱 QR CODE GERADO! Escaneie com seu WhatsApp:');
  console.log('');
  qrcode.generate(qr, { small: true });
  console.log('');
  console.log('🔗 Ou acesse: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qr));
});

client.on('ready', async () => {
  console.log('✅ WhatsApp conectado com sucesso!');
  
  const info = client.info;
  console.log('📞 Conectado como:', info.pushname);
  console.log('📱 Número:', info.wid.user);
  
  // Criar arquivo de configuração para Railway
  const sessionConfig = {
    connected: true,
    user: info.wid.user,
    pushname: info.pushname,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync('./railway-session-config.json', JSON.stringify(sessionConfig, null, 2));
  console.log('💾 Configuração salva em railway-session-config.json');
  
  // Instruções para transferir para Railway
  console.log('');
  console.log('🚀 PRÓXIMOS PASSOS PARA RAILWAY:');
  console.log('1. A sessão foi salva em ./local-wa-session/');
  console.log('2. Você precisa fazer upload desta pasta para o Railway');
  console.log('3. Configure a variável WA_DATA_PATH no Railway para apontar para esta sessão');
  console.log('');
  console.log('⚠️  IMPORTANTE: Mantenha este script rodando até confirmar que funciona no Railway');
  
  // Manter vivo para testes
  setInterval(() => {
    console.log('💓 Sessão ativa -', new Date().toLocaleTimeString());
  }, 30000);
});

client.on('authenticated', () => {
  console.log('🔐 Autenticado com sucesso!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Falha na autenticação:', msg);
});

client.on('disconnected', (reason) => {
  console.log('🔌 Desconectado:', reason);
});

console.log('🔄 Inicializando cliente WhatsApp local...');
client.initialize();
