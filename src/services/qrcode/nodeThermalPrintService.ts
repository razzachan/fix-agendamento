/**
 * Cliente para integração com serviço Node.js de impressão térmica
 * Conecta o frontend React com o servidor local de impressão
 */

import { QRCodeLabel } from '@/types/qrcode';
import { toast } from 'sonner';

export interface NodeThermalPrinter {
  type: 'usb' | 'bluetooth' | 'serial';
  name: string;
  vendorId?: number;
  productId?: number;
  address?: string;
  device?: any;
}

export interface NodeThermalServiceStatus {
  success: boolean;
  service: string;
  version: string;
  status: string;
  port: number;
}

export class NodeThermalPrintService {
  private static readonly SERVICE_URL = 'http://localhost:3001';
  private static readonly TIMEOUT = 5000; // 5 segundos

  /**
   * Verifica se o serviço Node.js está rodando
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      console.log('🔍 [NodeThermal] Verificando serviço...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(`${this.SERVICE_URL}/api/status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const status: NodeThermalServiceStatus = await response.json();
        console.log('✅ [NodeThermal] Serviço disponível:', status);
        return status.success && status.status === 'running';
      }

      return false;

    } catch (error) {
      console.log('⚠️ [NodeThermal] Serviço não disponível:', error);
      return false;
    }
  }

  /**
   * Lista impressoras disponíveis
   */
  static async getAvailablePrinters(): Promise<NodeThermalPrinter[]> {
    try {
      console.log('🖨️ [NodeThermal] Buscando impressoras...');

      const response = await fetch(`${this.SERVICE_URL}/api/printers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar impressoras');
      }

      // Combinar todas as impressoras encontradas
      const allPrinters: NodeThermalPrinter[] = [
        ...data.printers.usb,
        ...data.printers.bluetooth,
        ...data.printers.serial
      ];

      console.log('✅ [NodeThermal] Impressoras encontradas:', allPrinters);
      return allPrinters;

    } catch (error) {
      console.error('❌ [NodeThermal] Erro ao buscar impressoras:', error);
      throw error;
    }
  }

  /**
   * Imprime etiqueta via serviço Node.js
   */
  static async printLabel(
    label: QRCodeLabel, 
    printer?: NodeThermalPrinter,
    printerConfig: '58mm' | '80mm' = '58mm'
  ): Promise<boolean> {
    try {
      console.log('🖨️ [NodeThermal] Iniciando impressão...', {
        orderNumber: label.orderNumber,
        printer: printer?.name,
        config: printerConfig
      });

      // Se não especificou impressora, tentar encontrar uma automaticamente
      if (!printer) {
        const printers = await this.getAvailablePrinters();
        const usbPrinters = printers.filter(p => p.type === 'usb');
        
        if (usbPrinters.length > 0) {
          printer = usbPrinters[0];
          console.log('🔌 [NodeThermal] Usando impressora USB automática:', printer.name);
        } else {
          throw new Error('Nenhuma impressora encontrada. Conecte uma impressora USB.');
        }
      }

      // Preparar dados para impressão
      const printData = {
        orderNumber: label.orderNumber,
        clientName: label.clientName,
        equipmentType: label.equipmentType,
        description: label.description,
        qrCode: label.qrCode,
        generatedDate: label.generatedDate,
        printerConfig,
        connectionType: printer.type,
        deviceInfo: {
          name: printer.name,
          vendorId: printer.vendorId,
          productId: printer.productId,
          address: printer.address
        }
      };

      // Enviar para impressão
      const response = await fetch(`${this.SERVICE_URL}/api/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(printData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro na impressão');
      }

      console.log('✅ [NodeThermal] Impressão concluída:', result.message);
      toast.success('Etiqueta impressa com sucesso!');
      return true;

    } catch (error) {
      console.error('❌ [NodeThermal] Erro na impressão:', error);
      toast.error(`Erro na impressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return false;
    }
  }

  /**
   * Testa conexão com impressora específica
   */
  static async testPrinter(printer: NodeThermalPrinter): Promise<boolean> {
    try {
      console.log('🧪 [NodeThermal] Testando impressora:', printer.name);

      const testLabel: QRCodeLabel = {
        orderNumber: 'TESTE',
        clientName: 'Teste de Impressão',
        equipmentType: 'Teste',
        description: 'Teste de conectividade',
        qrCode: 'TEST_QR_CODE',
        generatedDate: new Date().toLocaleDateString('pt-BR'),
        qrCodeData: '',
        pickupCity: null,
        pickupState: null,
        pickupZipCode: null,
        currentLocation: 'test',
        serviceAttendanceType: 'coleta_diagnostico',
        clientDescription: '',
        images: [],
        serviceItems: [],
        finalCost: 0,
        workshopId: null,
        workshopName: null,
        printConfig: {
          labelWidth: 58,
          labelHeight: 32,
          qrSize: 20,
          fontSize: 8,
          includeText: true,
          includeOrderNumber: true,
          includeDate: true
        }
      };

      return await this.printLabel(testLabel, printer);

    } catch (error) {
      console.error('❌ [NodeThermal] Erro no teste:', error);
      return false;
    }
  }

  /**
   * Instala o serviço como serviço do Windows (opcional)
   */
  static getInstallInstructions(): string {
    return `
Para instalar o serviço de impressão térmica:

1. Baixe e instale Node.js: https://nodejs.org
2. Extraia os arquivos do serviço em uma pasta
3. Abra terminal na pasta e execute:
   npm install
4. Inicie o serviço:
   npm start
5. O serviço ficará disponível em http://localhost:3001

Para instalar como serviço do Windows:
   npm run install-service

O serviço iniciará automaticamente com o Windows.
    `.trim();
  }
}

export default NodeThermalPrintService;
