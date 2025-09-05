/**
 * Fix Fogões - Serviço de Impressão Térmica (Versão Simplificada para Dev)
 * Servidor Node.js para impressão em impressoras térmicas
 */

const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3002;

// Configurar CORS e middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    service: 'Fix Fogões Thermal Print Service (Dev Mode)',
    version: '1.0.0-dev',
    status: 'running',
    port: PORT,
    features: {
      qrcode: true,
      thermal_printing: false, // Desabilitado em dev
      bluetooth: false,
      usb: false,
      serial: false
    },
    message: 'Serviço rodando em modo desenvolvimento - impressão térmica desabilitada'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'thermal-print', port: PORT });
});

// Gerar QR Code (funcionalidade básica)
app.post('/api/qrcode', async (req, res) => {
  try {
    const { text, size = 200 } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    const qrCodeDataURL = await QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      qrcode: qrCodeDataURL,
      text: text,
      size: size
    });

  } catch (error) {
    console.error('❌ Erro ao gerar QR Code:', error);
    res.status(500).json({ error: 'Erro ao gerar QR Code' });
  }
});

// Simular impressão (dev mode)
app.post('/api/print', (req, res) => {
  console.log('🖨️ [DEV] Simulando impressão:', req.body);
  res.json({
    success: true,
    message: 'Impressão simulada com sucesso (modo desenvolvimento)',
    data: req.body
  });
});

// Página inicial
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fix Fogões - Thermal Print Service</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #E5B034; text-align: center; }
        .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .endpoint { background: #f8f9fa; padding: 10px; margin: 10px 0; border-left: 4px solid #E5B034; }
        .dev-mode { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffeaa7; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🖨️ Fix Fogões - Serviço de Impressão Térmica</h1>

        <div class="dev-mode">
          <h3>🚧 Modo Desenvolvimento</h3>
          <p>Este serviço está rodando em modo desenvolvimento.</p>
          <p>Funcionalidades de impressão térmica estão desabilitadas.</p>
        </div>

        <div class="status">
          <h3>✅ Serviço Ativo</h3>
          <p>Porta: ${PORT}</p>
          <p>Status: Funcionando</p>
        </div>

        <h3>📡 Endpoints Disponíveis:</h3>

        <div class="endpoint">
          <strong>GET /api/status</strong><br>
          Status do serviço e funcionalidades disponíveis
        </div>

        <div class="endpoint">
          <strong>GET /health</strong><br>
          Health check do serviço
        </div>

        <div class="endpoint">
          <strong>POST /api/qrcode</strong><br>
          Gerar QR Code<br>
          <code>{ "text": "conteudo", "size": 200 }</code>
        </div>

        <div class="endpoint">
          <strong>POST /api/print</strong><br>
          Simular impressão (modo dev)<br>
          <code>{ "content": "conteudo para impressao" }</code>
        </div>

        <h3>🔧 Para Produção:</h3>
        <p>Para habilitar impressão térmica real, instale as dependências:</p>
        <pre>npm install escpos escpos-usb escpos-serialport</pre>
      </div>
    </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 [ThermalService] Servidor iniciado na porta ${PORT}`);
  console.log(`📡 [ThermalService] Acesse: http://localhost:${PORT}`);
  console.log(`🖨️ [ThermalService] API: http://localhost:${PORT}/api/status`);
  console.log(`🚧 [ThermalService] Modo: Desenvolvimento (impressão desabilitada)`);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ [ThermalService] Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [ThermalService] Promise rejeitada:', reason);
});