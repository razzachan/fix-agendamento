/**
 * Fix Fogões - Serviço de Impressão Térmica
 * Servidor Node.js para impressão em impressoras térmicas via Bluetooth/USB
 */

const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
const QRCode = require('qrcode');

// Adapters para diferentes tipos de conexão
escpos.USB = require('escpos-usb');
escpos.Serial = require('escpos-serialport');

// Bluetooth com tratamento de erro melhorado
try {
  escpos.Bluetooth = require('escpos-bluetooth');
} catch (error) {
  console.log('⚠️ [ThermalService] Bluetooth adapter não disponível:', error.message);
}

// Bluetooth nativo do Node.js para discovery
const bluetooth = require('node-bluetooth');

const app = express();
const PORT = 3001;

/**
 * Escaneia dispositivos Bluetooth disponíveis
 */
async function scanBluetoothDevices() {
  return new Promise((resolve, reject) => {
    try {
      console.log('🔍 [Bluetooth] Iniciando scan...');

      // Timeout para o scan
      const timeout = setTimeout(() => {
        console.log('⏰ [Bluetooth] Timeout do scan');
        resolve([]);
      }, 10000); // 10 segundos

      const devices = [];

      // Usar bluetooth nativo se disponível
      if (bluetooth && bluetooth.inquire) {
        bluetooth.inquire((error, result) => {
          clearTimeout(timeout);

          if (error) {
            console.log('⚠️ [Bluetooth] Erro no scan:', error.message);
            resolve([]);
            return;
          }

          if (result && result.length > 0) {
            console.log(`✅ [Bluetooth] ${result.length} dispositivos encontrados`);

            // Filtrar possíveis impressoras (nomes comuns)
            const printerKeywords = ['print', 'thermal', 'pos', 'receipt', 'label', 'zebra', 'epson', 'brother'];

            const printers = result.filter(device => {
              const name = (device.name || '').toLowerCase();
              return printerKeywords.some(keyword => name.includes(keyword)) ||
                     name.includes('printer') ||
                     !device.name; // Incluir dispositivos sem nome (podem ser impressoras)
            });

            resolve(printers);
          } else {
            console.log('ℹ️ [Bluetooth] Nenhum dispositivo encontrado');
            resolve([]);
          }
        });
      } else {
        // Fallback: usar comando do sistema (Windows)
        const { exec } = require('child_process');

        exec('powershell "Get-PnpDevice -Class Bluetooth | Where-Object {$_.FriendlyName -like \'*print*\'} | Select-Object FriendlyName"',
          (error, stdout, stderr) => {
            clearTimeout(timeout);

            if (error) {
              console.log('⚠️ [Bluetooth] Erro no comando PowerShell:', error.message);
              resolve([]);
              return;
            }

            // Parse da saída do PowerShell
            const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('FriendlyName') && !line.includes('---'));
            const devices = lines.map(line => ({
              name: line.trim(),
              address: 'UNKNOWN_ADDRESS',
              paired: true
            }));

            console.log(`✅ [Bluetooth] ${devices.length} impressoras Bluetooth encontradas via PowerShell`);
            resolve(devices);
          }
        );
      }

    } catch (error) {
      console.log('❌ [Bluetooth] Erro geral no scan:', error.message);
      resolve([]);
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir arquivos estáticos

// Configurações de impressoras conhecidas
const PRINTER_CONFIGS = {
  '58mm': {
    width: 32,
    characterSet: 'PC437_USA',
    codeTable: 0
  },
  '80mm': {
    width: 48,
    characterSet: 'PC437_USA', 
    codeTable: 0
  }
};

/**
 * Lista impressoras disponíveis
 */
app.get('/api/printers', async (req, res) => {
  try {
    console.log('🔍 [ThermalService] Buscando impressoras...');
    
    const printers = {
      usb: [],
      bluetooth: [],
      serial: []
    };

    // Buscar impressoras USB
    try {
      const usbDevices = escpos.USB.findPrinter();
      printers.usb = usbDevices.map(device => ({
        type: 'usb',
        name: device.deviceDescriptor?.iProduct || 'Impressora USB',
        vendorId: device.deviceDescriptor?.idVendor,
        productId: device.deviceDescriptor?.idProduct,
        device: device
      }));
    } catch (error) {
      console.log('⚠️ [ThermalService] Erro ao buscar USB:', error.message);
    }

    // Buscar impressoras Bluetooth
    try {
      console.log('🔍 [ThermalService] Buscando dispositivos Bluetooth...');

      const bluetoothDevices = await scanBluetoothDevices();

      printers.bluetooth = bluetoothDevices.map(device => ({
        type: 'bluetooth',
        name: device.name || 'Impressora Bluetooth',
        address: device.address,
        rssi: device.rssi,
        paired: device.paired || false
      }));

      // Adicionar opção manual sempre
      printers.bluetooth.push({
        type: 'bluetooth',
        name: 'Configuração Manual',
        address: 'MANUAL_CONFIG',
        instructions: 'Digite o endereço MAC manualmente'
      });

    } catch (error) {
      console.log('⚠️ [ThermalService] Erro ao buscar Bluetooth:', error.message);

      // Fallback: apenas configuração manual
      printers.bluetooth = [{
        type: 'bluetooth',
        name: 'Configuração Manual',
        address: 'MANUAL_CONFIG',
        instructions: 'Digite o endereço MAC da sua impressora'
      }];
    }

    console.log('✅ [ThermalService] Impressoras encontradas:', printers);
    res.json({ success: true, printers });

  } catch (error) {
    console.error('❌ [ThermalService] Erro ao listar impressoras:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Imprime etiqueta térmica
 */
app.post('/api/print', async (req, res) => {
  try {
    const { 
      orderNumber, 
      clientName, 
      equipmentType, 
      description, 
      qrCode,
      generatedDate,
      printerConfig = '58mm',
      connectionType = 'usb',
      deviceInfo = {}
    } = req.body;

    console.log('🖨️ [ThermalService] Iniciando impressão:', {
      orderNumber,
      clientName,
      connectionType,
      printerConfig
    });

    // Validar dados obrigatórios
    if (!orderNumber || !clientName || !equipmentType) {
      return res.status(400).json({
        success: false,
        error: 'Dados obrigatórios faltando'
      });
    }

    // Configuração da impressora
    const config = PRINTER_CONFIGS[printerConfig] || PRINTER_CONFIGS['58mm'];

    // Conectar com a impressora
    let device;
    let printer;

    if (connectionType === 'usb') {
      // Conexão USB
      const usbDevices = escpos.USB.findPrinter();
      if (usbDevices.length === 0) {
        throw new Error('Nenhuma impressora USB encontrada');
      }
      
      device = new escpos.USB(usbDevices[0]);
      
    } else if (connectionType === 'bluetooth') {
      // Conexão Bluetooth melhorada
      if (!deviceInfo.address || deviceInfo.address === 'MANUAL_CONFIG') {
        throw new Error('Endereço Bluetooth não fornecido. Configure o endereço MAC da impressora.');
      }

      console.log(`🔵 [ThermalService] Conectando Bluetooth: ${deviceInfo.address}`);

      // Verificar se o adapter Bluetooth está disponível
      if (!escpos.Bluetooth) {
        throw new Error('Adapter Bluetooth não disponível. Instale: npm install escpos-bluetooth');
      }

      // Tentar diferentes canais Bluetooth (1, 2, 3)
      const channels = [1, 2, 3];
      let connected = false;

      for (const channel of channels) {
        try {
          console.log(`🔵 [ThermalService] Tentando canal ${channel}...`);
          device = new escpos.Bluetooth(deviceInfo.address, channel);

          // Testar conexão
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout no canal ${channel}`));
            }, 5000);

            device.open((error) => {
              clearTimeout(timeout);
              if (error) {
                reject(error);
              } else {
                connected = true;
                resolve();
              }
            });
          });

          if (connected) {
            console.log(`✅ [ThermalService] Conectado no canal ${channel}`);
            break;
          }

        } catch (channelError) {
          console.log(`⚠️ [ThermalService] Canal ${channel} falhou:`, channelError.message);
          if (device) {
            try { device.close(); } catch (e) {}
          }
          continue;
        }
      }

      if (!connected) {
        throw new Error(`Não foi possível conectar via Bluetooth. Verifique se:
1. A impressora está ligada e pareada
2. O endereço MAC está correto: ${deviceInfo.address}
3. A impressora não está sendo usada por outro app`);
      }
      
    } else {
      throw new Error('Tipo de conexão não suportado');
    }

    // Criar instância da impressora
    printer = new escpos.Printer(device, {
      encoding: config.characterSet,
      width: config.width
    });

    // Abrir conexão (se não for Bluetooth já conectado)
    if (connectionType !== 'bluetooth') {
      await new Promise((resolve, reject) => {
        device.open((error) => {
          if (error) {
            reject(new Error(`Erro ao conectar: ${error.message}`));
          } else {
            resolve();
          }
        });
      });
    }

    console.log('✅ [ThermalService] Conectado à impressora');

    // Gerar QR Code como imagem (se fornecido)
    let qrImage = null;
    if (qrCode) {
      try {
        const qrBuffer = await QRCode.toBuffer(qrCode, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        qrImage = qrBuffer;
      } catch (qrError) {
        console.log('⚠️ [ThermalService] Erro ao gerar QR Code:', qrError.message);
      }
    }

    // Imprimir etiqueta
    printer
      .font('a')
      .align('ct')
      .style('bu')
      .size(1, 1)
      .text('FIX FOGOES')
      .text('================')
      .style('normal')
      .size(0, 0)
      .text('')
      .align('ct')
      .style('b')
      .text(orderNumber)
      .style('normal')
      .text('================')
      .align('lt')
      .text(`Cliente: ${clientName}`)
      .text(`Equipamento: ${equipmentType}`);

    // Adicionar problema se houver
    if (description && description.trim()) {
      let problemText = description.trim();
      
      // Filtrar repetição do nome do equipamento
      if (problemText.toLowerCase().startsWith(equipmentType.toLowerCase())) {
        problemText = problemText.substring(equipmentType.length).trim();
        problemText = problemText.replace(/^[:\-\s]+/, '');
      }

      // Quebrar linha se muito longo
      if (problemText.length > config.width - 10) {
        const words = problemText.split(' ');
        let line = 'Problema: ';
        
        for (const word of words) {
          if ((line + word).length > config.width - 2) {
            printer.text(line);
            line = '  ' + word + ' ';
          } else {
            line += word + ' ';
          }
        }
        printer.text(line);
      } else {
        printer.text(`Problema: ${problemText}`);
      }
    }

    // Data
    if (generatedDate) {
      printer.text(`Data: ${generatedDate}`);
    }

    printer
      .text('================')
      .align('ct');

    // QR Code (se disponível)
    if (qrImage) {
      try {
        printer.image(qrImage, 's8');
      } catch (imgError) {
        console.log('⚠️ [ThermalService] Erro ao imprimir QR Code:', imgError.message);
        printer.text(`QR: ${qrCode}`);
      }
    }

    printer
      .text('app.fixfogoes.com.br')
      .text('')
      .text('')
      .text('')
      .cut()
      .close();

    console.log('✅ [ThermalService] Impressão concluída');

    res.json({ 
      success: true, 
      message: 'Etiqueta impressa com sucesso!' 
    });

  } catch (error) {
    console.error('❌ [ThermalService] Erro na impressão:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Testa conexão Bluetooth com impressora
 */
app.post('/api/bluetooth/test', async (req, res) => {
  try {
    const { address, channel = 1 } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Endereço MAC é obrigatório'
      });
    }

    console.log(`🧪 [ThermalService] Testando Bluetooth: ${address}`);

    if (!escpos.Bluetooth) {
      throw new Error('Adapter Bluetooth não disponível');
    }

    const device = new escpos.Bluetooth(address, channel);

    // Testar conexão
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout na conexão'));
      }, 10000);

      device.open((error) => {
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          // Fechar conexão imediatamente após teste
          device.close();
          resolve();
        }
      });
    });

    console.log(`✅ [ThermalService] Teste Bluetooth bem-sucedido: ${address}`);
    res.json({
      success: true,
      message: `Conexão Bluetooth OK: ${address}`,
      address,
      channel
    });

  } catch (error) {
    console.error(`❌ [ThermalService] Erro no teste Bluetooth:`, error);
    res.status(500).json({
      success: false,
      error: `Erro na conexão Bluetooth: ${error.message}`
    });
  }
});

/**
 * Status do serviço
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    service: 'Fix Fogões Thermal Print Service',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    features: {
      usb: true,
      bluetooth: !!escpos.Bluetooth,
      serial: true
    }
  });
});

/**
 * Página de teste
 */
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Fix Fogões - Serviço de Impressão Térmica</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .container { max-width: 600px; margin: 0 auto; }
          .status { background: #e8f5e8; padding: 20px; border-radius: 8px; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🖨️ Fix Fogões - Serviço de Impressão Térmica</h1>
          
          <div class="status">
            <h3>✅ Serviço Ativo</h3>
            <p>Porta: ${PORT}</p>
            <p>Status: Funcionando</p>
          </div>

          <h3>📡 Endpoints Disponíveis:</h3>
          
          <div class="endpoint">
            <strong>GET /api/status</strong><br>
            Verifica status do serviço
          </div>
          
          <div class="endpoint">
            <strong>GET /api/printers</strong><br>
            Lista impressoras disponíveis
          </div>
          
          <div class="endpoint">
            <strong>POST /api/print</strong><br>
            Imprime etiqueta térmica
          </div>

          <div class="endpoint">
            <strong>POST /api/bluetooth/test</strong><br>
            Testa conexão Bluetooth
          </div>

          <h3>🔧 Configuração:</h3>
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>🔵 Impressora Bluetooth:</h4>
            <p><a href="/bluetooth-config.html" style="color: #1976d2; text-decoration: none; font-weight: bold;">
              📱 Abrir Configurador Bluetooth →
            </a></p>
            <p style="margin: 0; color: #666; font-size: 14px;">
              Interface gráfica para configurar e testar impressoras Bluetooth
            </p>
          </div>

          <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h4>🔌 Impressora USB:</h4>
            <p style="margin: 0; color: #666;">
              Conecte via USB e use diretamente - detecção automática
            </p>
          </div>

          <h3>🚀 Como Usar:</h3>
          <ol>
            <li><strong>USB:</strong> Conecte a impressora e use normalmente</li>
            <li><strong>Bluetooth:</strong> Use o <a href="/bluetooth-config.html">Configurador Bluetooth</a></li>
            <li>Acesse o Fix Fogões no navegador</li>
            <li>O sistema detectará automaticamente este serviço</li>
            <li>Use o botão "🖨️ Imprimir" normalmente</li>
          </ol>
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
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ [ThermalService] Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [ThermalService] Promise rejeitada:', reason);
});
