/**
 * Serviço para impressão em impressoras térmicas Bluetooth
 * Suporte para técnicos mobile com impressoras portáteis
 */

import { QRCodeLabel } from '@/types/qrcode';
import { toast } from 'sonner';

export interface ThermalPrinterConfig {
  name: string;
  width: number; // Largura em caracteres
  supportsGraphics: boolean;
  escPosCommands: {
    init: string;
    bold: string;
    normal: string;
    center: string;
    left: string;
    cut: string;
    feed: string;
  };
}

export class ThermalPrintService {
  private static readonly PRINTER_CONFIGS: Record<string, ThermalPrinterConfig> = {
    'generic_58mm': {
      name: 'Impressora Térmica 58mm',
      width: 32,
      supportsGraphics: true,
      escPosCommands: {
        init: '\x1B\x40', // ESC @
        bold: '\x1B\x45\x01', // ESC E 1
        normal: '\x1B\x45\x00', // ESC E 0
        center: '\x1B\x61\x01', // ESC a 1
        left: '\x1B\x61\x00', // ESC a 0
        cut: '\x1D\x56\x00', // GS V 0
        feed: '\x0A\x0A\x0A' // LF LF LF
      }
    },
    'generic_80mm': {
      name: 'Impressora Térmica 80mm',
      width: 48,
      supportsGraphics: true,
      escPosCommands: {
        init: '\x1B\x40',
        bold: '\x1B\x45\x01',
        normal: '\x1B\x45\x00',
        center: '\x1B\x61\x01',
        left: '\x1B\x61\x00',
        cut: '\x1D\x56\x00',
        feed: '\x0A\x0A\x0A'
      }
    }
  };

  /**
   * Detecta se está em ambiente mobile
   */
  static isMobileEnvironment(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Verifica se Web Bluetooth está disponível
   */
  static isBluetoothAvailable(): boolean {
    return 'bluetooth' in navigator && typeof navigator.bluetooth.requestDevice === 'function';
  }

  /**
   * Detecta se está no Safari iOS (não suporta Web Bluetooth)
   */
  static isSafariIOS(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  }

  /**
   * Gera comandos ESC/POS para etiqueta
   */
  static generateESCPOSCommands(label: QRCodeLabel, config: ThermalPrinterConfig): string {
    const { escPosCommands } = config;
    let commands = '';

    // Inicializar impressora
    commands += escPosCommands.init;

    // Cabeçalho centralizado e em negrito
    commands += escPosCommands.center + escPosCommands.bold;
    commands += 'FIX FOGOES\n';
    commands += escPosCommands.normal;

    // Número da OS
    commands += escPosCommands.center + escPosCommands.bold;
    commands += `${label.orderNumber}\n`;
    commands += escPosCommands.normal;

    // Separador
    commands += escPosCommands.center;
    commands += '========================\n';

    // Informações alinhadas à esquerda
    commands += escPosCommands.left;
    commands += `Cliente: ${label.clientName}\n`;
    commands += `Equipamento: ${label.equipmentType}\n`;

    // Problema (se houver)
    if (label.description && label.description.trim()) {
      let problemText = label.description.trim();
      
      // Filtrar repetição do nome do equipamento
      if (problemText.toLowerCase().startsWith(label.equipmentType.toLowerCase())) {
        problemText = problemText.substring(label.equipmentType.length).trim();
        problemText = problemText.replace(/^[:\-\s]+/, '');
      }

      // Quebrar linha se muito longo
      const maxWidth = config.width - 10; // Margem
      if (problemText.length > maxWidth) {
        const words = problemText.split(' ');
        let line = 'Problema: ';
        
        for (const word of words) {
          if ((line + word).length > maxWidth) {
            commands += line + '\n';
            line = '  ' + word + ' ';
          } else {
            line += word + ' ';
          }
        }
        commands += line + '\n';
      } else {
        commands += `Problema: ${problemText}\n`;
      }
    }

    // Data
    commands += `Data: ${label.generatedDate}\n`;

    // Separador
    commands += escPosCommands.center;
    commands += '========================\n';

    // QR Code (se suportado)
    if (config.supportsGraphics) {
      commands += escPosCommands.center;
      commands += '[QR CODE AQUI]\n';
      commands += `Codigo: ${label.qrCode}\n`;
    }

    // Rodapé
    commands += escPosCommands.center;
    commands += 'app.fixfogoes.com.br\n';

    // Alimentar papel e cortar
    commands += escPosCommands.feed;
    commands += escPosCommands.cut;

    return commands;
  }

  /**
   * Conecta com impressora Bluetooth (Web Bluetooth API)
   */
  static async connectBluetoothPrinter(): Promise<BluetoothDevice | null> {
    if (!this.isBluetoothAvailable()) {
      toast.error('Bluetooth não disponível neste navegador');
      return null;
    }

    try {
      console.log('🔵 [ThermalPrint] Solicitando conexão Bluetooth...');
      
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Impressoras térmicas genéricas
          '0000ff00-0000-1000-8000-00805f9b34fb'  // Algumas impressoras chinesas
        ]
      });

      console.log('✅ [ThermalPrint] Dispositivo selecionado:', device.name);
      return device;

    } catch (error) {
      console.error('❌ [ThermalPrint] Erro ao conectar Bluetooth:', error);
      toast.error('Erro ao conectar com impressora Bluetooth');
      return null;
    }
  }

  /**
   * Imprime via Bluetooth
   */
  static async printViaBluetooth(label: QRCodeLabel, device: BluetoothDevice): Promise<boolean> {
    try {
      console.log('🖨️ [ThermalPrint] Iniciando impressão Bluetooth...');

      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error('Não foi possível conectar ao servidor GATT');
      }

      // Tentar diferentes serviços
      const serviceUUIDs = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb'
      ];

      let service = null;
      for (const uuid of serviceUUIDs) {
        try {
          service = await server.getPrimaryService(uuid);
          break;
        } catch (e) {
          continue;
        }
      }

      if (!service) {
        throw new Error('Serviço de impressão não encontrado');
      }

      const characteristic = await service.getCharacteristic('0000ff01-0000-1000-8000-00805f9b34fb');
      
      // Gerar comandos ESC/POS
      const config = this.PRINTER_CONFIGS['generic_58mm'];
      const commands = this.generateESCPOSCommands(label, config);
      
      // Converter para bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(commands);

      // Enviar dados em chunks (impressoras Bluetooth têm limite)
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50)); // Delay entre chunks
      }

      console.log('✅ [ThermalPrint] Impressão Bluetooth concluída');
      toast.success('Etiqueta impressa via Bluetooth!');
      return true;

    } catch (error) {
      console.error('❌ [ThermalPrint] Erro na impressão Bluetooth:', error);
      toast.error(`Erro na impressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    }
  }

  // ❌ REMOVIDO: Funções que causavam navegação indevida
  // As funções generateThermalAppURL, getKnownThermalApps e tryOpenThermalApp
  // foram removidas porque usavam window.location.href incorretamente

  /**
   * Compartilha dados da etiqueta via Share API
   * VERSÃO SEGURA - SEM NAVEGAÇÃO
   */
  static async shareForThermalPrint(label: QRCodeLabel): Promise<boolean> {
    console.log('📤 [ThermalPrint] Tentando Share API...');

    if (!navigator.share) {
      console.log('⚠️ [ThermalPrint] Share API não disponível - usando clipboard');
      return await this.copyToClipboard(label);
    }

    try {
      // Filtrar problema para evitar repetição
      let problemText = label.description || '';
      if (problemText && problemText.toLowerCase().startsWith(label.equipmentType.toLowerCase())) {
        problemText = problemText.substring(label.equipmentType.length).trim();
        problemText = problemText.replace(/^[:\-\s]+/, '');
      }

      const printData = `FIX FOGÕES - ${label.orderNumber}
Cliente: ${label.clientName}
Equipamento: ${label.equipmentType}
${problemText ? `Problema: ${problemText}` : ''}
Data: ${label.generatedDate}
QR: ${label.qrCode}
app.fixfogoes.com.br`;

      console.log('📤 [ThermalPrint] Chamando navigator.share...');

      await navigator.share({
        title: `Etiqueta ${label.orderNumber} - Fix Fogões`,
        text: printData
      });

      console.log('✅ [ThermalPrint] Share API executado com sucesso');
      toast.success('📤 Selecione seu app de impressão térmica!', {
        description: 'Procure por apps como "Thermal Printer" ou "ESC/POS"'
      });
      return true;

    } catch (error) {
      console.log('⚠️ [ThermalPrint] Erro no Share API:', error);

      if (error.name === 'AbortError') {
        console.log('ℹ️ [ThermalPrint] Usuário cancelou o compartilhamento');
        return false;
      }

      // Fallback: copiar para clipboard
      console.log('📋 [ThermalPrint] Usando fallback clipboard...');
      return await this.copyToClipboard(label);
    }
  }

  /**
   * Copia dados da etiqueta para clipboard (fallback)
   */
  static async copyToClipboard(label: QRCodeLabel): Promise<boolean> {
    try {
      let problemText = label.description || '';
      if (problemText.toLowerCase().startsWith(label.equipmentType.toLowerCase())) {
        problemText = problemText.substring(label.equipmentType.length).trim();
        problemText = problemText.replace(/^[:\-\s]+/, '');
      }

      const printData = `FIX FOGÕES - ${label.orderNumber}
Cliente: ${label.clientName}
Equipamento: ${label.equipmentType}
${problemText ? `Problema: ${problemText}` : ''}
Data: ${label.generatedDate}
QR: ${label.qrCode}
app.fixfogoes.com.br`;

      await navigator.clipboard.writeText(printData);

      toast.success('📋 Dados copiados!', {
        description: 'Cole no seu app de impressão térmica'
      });
      return true;

    } catch (error) {
      console.log('⚠️ [ThermalPrint] Erro ao copiar:', error);
      toast.error('Erro ao compartilhar dados da etiqueta');
      return false;
    }
  }

  /**
   * Método principal - APENAS SHARE API
   * Remove todas as tentativas de URL que causam problemas
   */
  static async printThermalLabel(label: QRCodeLabel): Promise<boolean> {
    console.log('🖨️ [ThermalPrint] Iniciando impressão térmica...');
    console.log('🖨️ [ThermalPrint] Mobile:', this.isMobileEnvironment());

    if (this.isMobileEnvironment()) {
      console.log('📱 [ThermalPrint] Usando apenas Share API nativo');

      // ÚNICA ESTRATÉGIA: Share API nativo (sem tentativas de URL)
      try {
        const shareSuccess = await this.shareForThermalPrint(label);
        if (shareSuccess) {
          return true;
        }
      } catch (error) {
        console.log('⚠️ [ThermalPrint] Share API falhou:', error);
      }

      // Se falhou, orientar para PNG
      toast.info('💡 Use o botão "📱 PNG" para baixar a imagem', {
        duration: 5000,
        description: 'Depois abra na galeria e compartilhe com seu app de impressão'
      });
      return false;
    }

    // Desktop: não usar impressão térmica
    console.log('🖥️ [ThermalPrint] Desktop - usar impressão padrão');
    return false;
  }
}

export default ThermalPrintService;
