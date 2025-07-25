/**
 * Serviço para geração e impressão de etiquetas com QR Code
 */

import { QRCodeLabel, QRCodePrintConfig, QR_CODE_CONSTANTS } from '@/types/qrcode';
import { ServiceOrder } from '@/types';
import { QRCodeService } from './qrCodeService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class QRPrintService {
  /**
   * Configuração padrão para etiquetas
   */
  private static readonly DEFAULT_CONFIG: QRCodePrintConfig = {
    labelWidth: QR_CODE_CONSTANTS.DEFAULT_LABEL_SIZE.width,
    labelHeight: QR_CODE_CONSTANTS.DEFAULT_LABEL_SIZE.height,
    qrSize: QR_CODE_CONSTANTS.DEFAULT_LABEL_SIZE.qrSize,
    fontSize: 8,
    includeText: true,
    includeOrderNumber: true,
    includeDate: true
  };

  /**
   * Gera etiqueta para impressão
   */
  static async generateLabel(
    serviceOrder: ServiceOrder,
    qrCode: string,
    config: Partial<QRCodePrintConfig> = {}
  ): Promise<QRCodeLabel> {
    try {
      console.log('🏷️ [QRPrintService] Gerando etiqueta para OS:', serviceOrder.id);

      const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

      // Gerar URL completa para o QR Code
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : 'https://app.fixfogoes.com.br';
      const trackingUrl = `${baseUrl}/track/${qrCode}`;

      // Gerar imagem do QR Code com URL completa
      const qrCodeImage = await QRCodeService.generateQRCodeImage(trackingUrl, finalConfig.qrSize * 4);

      const label: QRCodeLabel = {
        qrCode,
        qrCodeData: qrCodeImage,
        orderNumber: serviceOrder.orderNumber || `OS #${serviceOrder.id.substring(0, 8).toUpperCase()}`,
        equipmentType: serviceOrder.equipmentType,
        clientName: serviceOrder.clientName,
        description: serviceOrder.description || '', // 🔧 QR CODE: Incluir problema relatado
        generatedDate: new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        printConfig: finalConfig
      };

      console.log('✅ [QRPrintService] Etiqueta gerada com sucesso');
      return label;

    } catch (error) {
      console.error('❌ [QRPrintService] Erro ao gerar etiqueta:', error);
      console.error('❌ [QRPrintService] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      throw new Error(`Erro ao gerar etiqueta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Gera PDF da etiqueta para impressão
   */
  static async generatePDF(label: QRCodeLabel): Promise<string> {
    try {
      console.log('📄 [QRPrintService] Gerando PDF da etiqueta');

      // Criar elemento HTML temporário para a etiqueta
      const labelElement = this.createLabelElement(label);
      document.body.appendChild(labelElement);

      // Converter para canvas
      const canvas = await html2canvas(labelElement, {
        width: label.printConfig.labelWidth * 3.78, // Converter mm para pixels (96 DPI)
        height: label.printConfig.labelHeight * 3.78,
        scale: 2,
        backgroundColor: '#ffffff'
      });

      // Remover elemento temporário
      document.body.removeChild(labelElement);

      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [label.printConfig.labelWidth, label.printConfig.labelHeight]
      });

      // Adicionar imagem ao PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(
        imgData, 
        'PNG', 
        0, 
        0, 
        label.printConfig.labelWidth, 
        label.printConfig.labelHeight
      );

      // Retornar como data URL
      const pdfDataUrl = pdf.output('dataurlstring');
      
      console.log('✅ [QRPrintService] PDF gerado com sucesso');
      return pdfDataUrl;

    } catch (error) {
      console.error('❌ [QRPrintService] Erro ao gerar PDF:', error);
      throw new Error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Imprime etiqueta diretamente
   */
  static async printLabel(label: QRCodeLabel): Promise<boolean> {
    try {
      console.log('🖨️ [QRPrintService] Iniciando impressão da etiqueta');

      // Gerar PDF
      const pdfDataUrl = await this.generatePDF(label);

      // Abrir janela de impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir janela de impressão');
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Etiqueta QR Code - ${label.orderNumber}</title>
            <style>
              body { margin: 0; padding: 0; }
              iframe { width: 100%; height: 100vh; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${pdfDataUrl}"></iframe>
          </body>
        </html>
      `);

      printWindow.document.close();
      
      // Aguardar carregamento e imprimir
      setTimeout(() => {
        printWindow.print();
      }, 1000);

      console.log('✅ [QRPrintService] Impressão iniciada');
      return true;

    } catch (error) {
      console.error('❌ [QRPrintService] Erro ao imprimir:', error);
      return false;
    }
  }

  /**
   * Baixa etiqueta como PNG (melhor para mobile)
   */
  static async downloadLabel(label: QRCodeLabel): Promise<void> {
    try {
      console.log('💾 [QRPrintService] Baixando etiqueta como PNG');

      // Criar elemento HTML temporário para a etiqueta
      const labelElement = this.createLabelElement(label);
      document.body.appendChild(labelElement);

      // Converter para canvas
      const canvas = await html2canvas(labelElement, {
        width: label.printConfig.labelWidth * 3.78, // Converter mm para pixels (96 DPI)
        height: label.printConfig.labelHeight * 3.78,
        scale: 2,
        backgroundColor: '#ffffff'
      });

      // Remover elemento temporário
      document.body.removeChild(labelElement);

      // Converter canvas para PNG
      const pngDataUrl = canvas.toDataURL('image/png', 1.0);

      // Criar link de download
      const link = document.createElement('a');
      link.href = pngDataUrl;
      link.download = `etiqueta_${label.orderNumber.replace(/[^a-zA-Z0-9]/g, '_')}.png`;

      // Simular clique
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ [QRPrintService] Download PNG iniciado');

    } catch (error) {
      console.error('❌ [QRPrintService] Erro ao baixar PNG:', error);
      throw error;
    }
  }

  /**
   * Baixa etiqueta como PDF (mantido para compatibilidade)
   */
  static async downloadLabelAsPDF(label: QRCodeLabel): Promise<void> {
    try {
      console.log('💾 [QRPrintService] Baixando etiqueta como PDF');

      const pdfDataUrl = await this.generatePDF(label);

      // Criar link de download
      const link = document.createElement('a');
      link.href = pdfDataUrl;
      link.download = `etiqueta_${label.orderNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

      // Simular clique
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ [QRPrintService] Download PDF iniciado');

    } catch (error) {
      console.error('❌ [QRPrintService] Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Cria elemento HTML da etiqueta
   */
  private static createLabelElement(label: QRCodeLabel): HTMLElement {
    const element = document.createElement('div');
    element.style.cssText = `
      width: ${label.printConfig.labelWidth}mm;
      height: ${label.printConfig.labelHeight}mm;
      background: white;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2mm;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      position: absolute;
      top: -9999px;
      left: -9999px;
    `;

    // QR Code
    const qrContainer = document.createElement('div');
    qrContainer.style.cssText = `
      width: ${label.printConfig.qrSize}mm;
      height: ${label.printConfig.qrSize}mm;
      flex-shrink: 0;
    `;

    const qrImage = document.createElement('img');
    qrImage.src = label.qrCodeData;
    qrImage.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
    `;
    qrContainer.appendChild(qrImage);

    // Informações de texto
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      flex: 1;
      margin-left: 2mm;
      font-size: ${label.printConfig.fontSize}pt;
      line-height: 1.2;
    `;

    if (label.printConfig.includeText) {
      if (label.printConfig.includeOrderNumber) {
        const orderDiv = document.createElement('div');
        orderDiv.style.fontWeight = 'bold';
        orderDiv.textContent = label.orderNumber;
        textContainer.appendChild(orderDiv);
      }

      const clientDiv = document.createElement('div');
      clientDiv.textContent = label.clientName.substring(0, 20);
      textContainer.appendChild(clientDiv);

      const equipmentDiv = document.createElement('div');
      equipmentDiv.textContent = label.equipmentType.substring(0, 15);
      textContainer.appendChild(equipmentDiv);

      // 🔧 QR CODE: Incluir problema/descrição na etiqueta - Mais espaço
      if (label.description && label.description.trim()) {
        const descriptionDiv = document.createElement('div');
        descriptionDiv.style.fontSize = `${label.printConfig.fontSize - 1}pt`;
        descriptionDiv.style.color = '#444';
        descriptionDiv.style.fontStyle = 'italic';
        descriptionDiv.style.lineHeight = '1.2';
        descriptionDiv.style.wordWrap = 'break-word';
        descriptionDiv.style.maxWidth = '100%';

        // 🔧 PROBLEMA: Filtrar repetição do nome do equipamento
        let problemText = label.description.trim();

        // Se o problema começa com o nome do equipamento, remover
        if (problemText.toLowerCase().startsWith(label.equipmentType.toLowerCase())) {
          problemText = problemText.substring(label.equipmentType.length).trim();
          // Remover pontuação inicial se houver
          problemText = problemText.replace(/^[:\-\s]+/, '');
        }

        // Limitar a 45 caracteres para caber melhor na etiqueta
        const finalText = problemText.length > 45
          ? `${problemText.substring(0, 45)}...`
          : problemText;

        descriptionDiv.textContent = `Problema: ${finalText}`;
        textContainer.appendChild(descriptionDiv);
      }

      if (label.printConfig.includeDate) {
        const dateDiv = document.createElement('div');
        dateDiv.style.fontSize = `${label.printConfig.fontSize - 1}pt`;
        dateDiv.style.color = '#666';
        dateDiv.textContent = label.generatedDate;
        textContainer.appendChild(dateDiv);
      }
    }

    element.appendChild(qrContainer);
    element.appendChild(textContainer);

    return element;
  }

  /**
   * Valida configuração de impressão
   */
  static validatePrintConfig(config: QRCodePrintConfig): boolean {
    return (
      config.labelWidth > 0 &&
      config.labelHeight > 0 &&
      config.qrSize > 0 &&
      config.qrSize <= Math.min(config.labelWidth, config.labelHeight) &&
      config.fontSize > 0
    );
  }

  /**
   * Obtém configurações de impressora recomendadas
   */
  static getPrinterConfigs(): Record<string, QRCodePrintConfig> {
    return {
      'brother_ql820': {
        labelWidth: 62,
        labelHeight: 29,
        qrSize: 20,
        fontSize: 8,
        includeText: true,
        includeOrderNumber: true,
        includeDate: true
      },
      'zebra_zd230': {
        labelWidth: 58,
        labelHeight: 32,
        qrSize: 22,
        fontSize: 9,
        includeText: true,
        includeOrderNumber: true,
        includeDate: true
      },
      'dymo_450': {
        labelWidth: 54,
        labelHeight: 25,
        qrSize: 18,
        fontSize: 7,
        includeText: true,
        includeOrderNumber: true,
        includeDate: false
      }
    };
  }
}

export default QRPrintService;
