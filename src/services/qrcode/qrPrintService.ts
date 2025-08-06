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
   * 🧪 TESTE: Função para testar quebra de linha
   */
  static testLineBreak(text: string, maxChars: number = 16): string[] {
    console.log(`🧪 [TESTE] Testando quebra de linha para: "${text}"`);
    console.log(`🧪 [TESTE] Máximo de caracteres por linha: ${maxChars}`);

    const lines = [];
    for (let i = 0; i < text.length; i += maxChars) {
      lines.push(text.substring(i, i + maxChars));
    }

    console.log(`🧪 [TESTE] Resultado:`, lines);
    console.log(`🧪 [TESTE] HTML: ${lines.join('<br>')}`);

    return lines;
  }

  /**
   * 🧪 TESTE: Criar elemento de teste para verificar renderização
   */
  static createTestElement(): void {
    console.log('🧪 [TESTE] Criando elemento de teste...');

    // Remover elemento anterior se existir
    const existing = document.getElementById('test-line-break');
    if (existing) {
      existing.remove();
    }

    // Criar elemento de teste
    const testDiv = document.createElement('div');
    testDiv.id = 'test-line-break';
    testDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 200px;
      background: white;
      border: 2px solid red;
      padding: 10px;
      z-index: 9999;
      font-family: Arial, sans-serif;
      font-size: 12px;
    `;

    // Teste com texto longo
    const longText = "Fogão elétrico por indução Fischer 2 bocas que não está aquecendo";
    const lines = this.testLineBreak(longText, 16);

    testDiv.innerHTML = `
      <h4>🧪 TESTE DE QUEBRA</h4>
      <p><strong>Original:</strong><br>${longText}</p>
      <p><strong>Quebrado (16 chars):</strong><br>${lines.join('<br>')}</p>
      <button onclick="document.getElementById('test-line-break').remove()">Fechar</button>
    `;

    document.body.appendChild(testDiv);
    console.log('🧪 [TESTE] Elemento criado! Verifique no canto superior direito.');
  }

  /**
   * 🧪 TESTE: Criar etiqueta de teste completa
   */
  static createTestLabel(): void {
    console.log('🧪 [TESTE] Criando etiqueta de teste...');

    // Remover elemento anterior se existir
    const existing = document.getElementById('test-label');
    if (existing) {
      existing.remove();
    }

    // Dados de teste
    const testLabel: QRCodeLabel = {
      qrCode: 'TEST123',
      qrCodeData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      serviceOrderId: 'test-id',
      orderNumber: '#028',
      equipmentType: 'Fogão elétrico por indução Fischer 2 bocas',
      clientName: 'Denise Deibler da Silva Santos',
      description: 'Fischer 2 bocas que não está aquecendo corretamente',
      generatedDate: '31/07/2025',
      printConfig: this.DEFAULT_CONFIG
    };

    // Criar elemento de teste
    const testElement = this.createLabelElement(testLabel);
    testElement.id = 'test-label';
    testElement.style.cssText = `
      position: fixed;
      top: 50px;
      left: 10px;
      background: white;
      border: 2px solid blue;
      z-index: 9998;
      transform: scale(2);
      transform-origin: top left;
    `;

    // Adicionar botão de fechar
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fechar Teste';
    closeBtn.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 9999;
      background: red;
      color: white;
      border: none;
      padding: 5px 10px;
      cursor: pointer;
    `;
    closeBtn.onclick = () => {
      testElement.remove();
      closeBtn.remove();
    };

    document.body.appendChild(testElement);
    document.body.appendChild(closeBtn);
    console.log('🧪 [TESTE] Etiqueta de teste criada! Verifique no canto superior esquerdo.');
  }

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
      const qrCodeSize = finalConfig.qrSize * 4;
      console.log('🎯 [QRPrintService] Gerando QR Code com tamanho:', qrCodeSize, 'px');
      console.log('🎯 [QRPrintService] finalConfig.qrSize:', finalConfig.qrSize);
      const qrCodeImage = await QRCodeService.generateQRCodeImage(trackingUrl, qrCodeSize);

      const label: QRCodeLabel = {
        qrCode,
        qrCodeData: qrCodeImage,
        serviceOrderId: serviceOrder.id, // UUID da ordem de serviço
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
   * Cria HTML da etiqueta para exibição direta
   */
  private static createLabelHTML(label: QRCodeLabel): string {
    // Debug: Log dos dados recebidos
    console.log('🔍 [createLabelHTML] Dados da etiqueta:', {
      orderNumber: label.orderNumber,
      clientName: label.clientName,
      equipmentType: label.equipmentType,
      generatedDate: label.generatedDate,
      qrCodeData: label.qrCodeData ? `Presente (${label.qrCodeData.substring(0, 50)}...)` : 'AUSENTE - PROBLEMA!'
    });

    // Debug específico do QR Code
    if (!label.qrCodeData) {
      console.error('❌ [createLabelHTML] QR Code Data está vazio!');
    } else {
      console.log('✅ [createLabelHTML] QR Code Data OK, tamanho:', label.qrCodeData.length);
    }

    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        font-family: Arial, sans-serif;
        height: 100%;
        padding: 1.4mm 1.4mm 1.4mm 1.4mm;
        box-sizing: border-box;
      ">
        <!-- Container do conteúdo no topo-esquerda -->
        <div style="
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
          gap: 1.4mm;
          width: 100%;
        ">
          <!-- QR Code à esquerda -->
          <div style="
            flex-shrink: 0;
            width: ${label.printConfig.qrSize}mm;
            height: ${label.printConfig.qrSize}mm;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #ccc;
            background: ${label.qrCodeData ? 'white' : '#f0f0f0'};
          ">
            ${label.qrCodeData
              ? `<img src="${label.qrCodeData}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;" />`
              : `<div style="font-size: 1.5mm; color: #666; text-align: center;">QR<br>CODE</div>`
            }
          </div>

          <!-- Informações à direita -->
          <div style="
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-width: 0;
          ">
            <div style="font-weight: bold; font-size: 2.8mm; margin-bottom: 0.7mm; line-height: 1.2;">${label.orderNumber || 'N/A'}</div>
            <div style="font-size: 2.5mm; color: #333; margin-bottom: 0.7mm; line-height: 1.2; word-wrap: break-word;">${label.clientName || 'N/A'}</div>
            <div style="font-size: 2.3mm; color: #666; margin-bottom: 0.7mm; line-height: 1.2; word-wrap: break-word;">${label.equipmentType || 'N/A'}</div>
            ${label.description ? `<div style="font-size: 2.1mm; color: #888; margin-bottom: 0.7mm; line-height: 1.2; font-style: italic; word-wrap: break-word;">${label.description}</div>` : ''}
            <div style="font-size: 2.1mm; color: #999; line-height: 1.2;">${label.generatedDate || 'N/A'}</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Gera PDF da etiqueta para impressão
   */
  static async generatePDF(label: QRCodeLabel): Promise<string> {
    try {
      console.log('📄 [QRPrintService] Iniciando geração de PDF');
      console.log('🔍 Dados da etiqueta:', {
        orderNumber: label.orderNumber,
        qrCodeData: label.qrCodeData ? 'Presente' : 'Ausente'
      });

      // Criar elemento HTML temporário usando o HTML que funciona
      const labelElement = document.createElement('div');
      labelElement.style.cssText = `
        width: 40.6mm;
        height: 46.2mm;
        background: white;
        border: 1px solid #ccc;
        padding: 1.4mm;
        box-sizing: border-box;
        position: absolute;
        top: -9999px;
        left: -9999px;
      `;

      const htmlContent = this.createLabelHTML(label);
      console.log('🔍 HTML gerado:', htmlContent.substring(0, 100) + '...');

      labelElement.innerHTML = htmlContent;
      document.body.appendChild(labelElement);
      console.log('✅ Elemento adicionado ao DOM');

      // Aguardar um pouco para garantir renderização
      await new Promise(resolve => setTimeout(resolve, 500));

      // Converter para canvas (40.6mm x 52.5mm)
      console.log('🎨 Convertendo para canvas...');
      const canvas = await html2canvas(labelElement, {
        width: 40.6 * 3.78, // 40.6mm para pixels (96 DPI)
        height: 46.2 * 3.78, // 46.2mm para pixels
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });
      console.log('✅ Canvas criado:', canvas.width + 'x' + canvas.height);

      // Remover elemento temporário
      document.body.removeChild(labelElement);

      // Criar PDF (40.6mm x 52.5mm)
      console.log('📄 Criando PDF...');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [40.6, 46.2]
      });

      // Adicionar imagem ao PDF
      const imgData = canvas.toDataURL('image/png');
      console.log('🖼️ Imagem gerada, tamanho:', imgData.length, 'chars');

      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        40.6,
        46.2
      );
      console.log('✅ Imagem adicionada ao PDF');

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
   * Imprime etiqueta via PDF (sem cabeçalhos do navegador)
   */
  static async printLabel(label: QRCodeLabel): Promise<boolean> {
    try {
      console.log('🖨️ [QRPrintService] Iniciando impressão da etiqueta');

      // Usar método HTML direto (mais confiável)
      return await this.printLabelHTML(label);
    } catch (error) {
      console.error('❌ [QRPrintService] Erro na impressão:', error);
      throw error;
    }
  }

  /**
   * Imprime etiqueta diretamente via HTML (método alternativo)
   */
  static async printLabelHTML(label: QRCodeLabel): Promise<boolean> {
    try {
      console.log('🖨️ [QRPrintService] Iniciando impressão HTML da etiqueta');

      // Gerar HTML da etiqueta diretamente
      const labelHtml = this.createLabelHTML(label);
      const finalHtml = labelHtml;

      // Criar HTML da página de impressão
      const htmlContent = `
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title></title>
            <style>
              body {
                margin: 0;
                padding: 10px;
                font-family: Arial, sans-serif;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                height: auto;
              }
              .label-container {
                background: white;
                border: 2px dashed #ccc;
                border-radius: 4px;
                padding: 3mm 3mm 4mm 3mm;
                margin: 2mm auto;
                width: 58mm;
                height: 40mm;
                box-sizing: border-box;
                overflow: hidden;
              }

              .label-content {
                width: 100%;
                height: 100%;
                background: white;
                border: 1px solid #ddd;
                border-radius: 2px;
                padding: 2mm;
                display: flex;
                align-items: center;
                gap: 2mm;
                box-sizing: border-box;
              }
              .print-button {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin: 10px;
                font-size: 14px;
              }
              .print-button:hover {
                background: #0056b3;
              }
              @media print {
                @page {
                  size: 40.6mm 46.2mm;
                  margin: 0 !important;
                }

                /* Forçar remoção de cabeçalhos e rodapés */
                @page :first {
                  margin-top: 0 !important;
                }
                @page :left {
                  margin-left: 0 !important;
                }
                @page :right {
                  margin-right: 0 !important;
                }
                body {
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  height: 40mm !important;
                  width: 58mm !important;
                  overflow: hidden !important;
                }
                .print-button { display: none !important; }
                .label-container {
                  border: none !important;
                  margin: 0 !important;
                  padding: 1.4mm !important;
                  max-width: none !important;
                  width: 40.6mm !important;
                  height: 46.2mm !important;
                  box-sizing: border-box !important;
                }
                .label-content {
                  border: none !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: 100% !important;
                  box-sizing: border-box !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="label-content">
                ${finalHtml}
              </div>
            </div>
            <button class="print-button" onclick="window.print()">🖨️ Imprimir Etiqueta</button>
            <button class="print-button" onclick="window.close()" style="background: #6c757d;">❌ Fechar</button>

            <script>
              // Tentar remover cabeçalhos e rodapés
              window.addEventListener('beforeprint', function() {
                document.title = '';
              });
            </script>
          </body>
        </html>
      `;

      // Abrir janela vazia e escrever HTML diretamente
      const printWindow = window.open('', '_blank', `width=420,height=250,scrollbars=no,resizable=yes`);
      if (!printWindow) {
        throw new Error('Não foi possível abrir janela de impressão');
      }

      // Escrever HTML diretamente na janela
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Aguardar carregamento completo antes de imprimir
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
   * Cria elemento HTML da etiqueta (layout vertical)
   */
  private static createLabelElement(label: QRCodeLabel): HTMLElement {
    const element = document.createElement('div');
    element.style.cssText = `
      width: ${label.printConfig.labelWidth}mm;
      height: ${label.printConfig.labelHeight}mm;
      background: white;
      border: 1px solid #ccc;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2mm;
      padding: 2mm;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      text-align: left;
      position: absolute;
      top: -9999px;
      left: -9999px;
    `;

    // QR Code no topo
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
      border: 1px solid #ccc;
    `;
    qrContainer.appendChild(qrImage);

    // Informações de texto embaixo do QR
    const textContainer = document.createElement('div');
    textContainer.style.cssText = `
      width: 100%;
      text-align: left;
      font-size: ${label.printConfig.fontSize}pt;
      line-height: 1.0;
    `;

    if (label.printConfig.includeText) {
      if (label.printConfig.includeOrderNumber) {
        const orderDiv = document.createElement('div');
        orderDiv.style.cssText = `
          font-weight: bold;
          font-size: 7.9pt;
          line-height: 1.2;
          white-space: normal;
          word-wrap: break-word;
        `;
        // Quebrar número da OS em 14 caracteres
        const orderText = label.orderNumber;
        const orderLines = [];
        for (let i = 0; i < orderText.length; i += 14) {
          orderLines.push(orderText.substring(i, i + 14));
        }
        orderDiv.innerHTML = orderLines.join('<br>');
        textContainer.appendChild(orderDiv);
      }

      const clientDiv = document.createElement('div');
      clientDiv.style.cssText = `
        font-size: 6.8pt;
        color: #333;
        line-height: 1.2;
        word-wrap: break-word;
        white-space: normal;
      `;
      // Quebrar nome do cliente em 14 caracteres
      const clientText = label.clientName;
      const clientLines = [];
      for (let i = 0; i < clientText.length; i += 14) {
        clientLines.push(clientText.substring(i, i + 14));
      }
      clientDiv.innerHTML = clientLines.join('<br>');
      textContainer.appendChild(clientDiv);

      const equipmentDiv = document.createElement('div');
      equipmentDiv.style.cssText = `
        font-size: 6.2pt;
        color: #666;
        line-height: 1.2;
        word-wrap: break-word;
        white-space: normal;
      `;
      // Quebrar equipamento em 14 caracteres
      const equipText = label.equipmentType;
      const equipLines = [];
      for (let i = 0; i < equipText.length; i += 14) {
        equipLines.push(equipText.substring(i, i + 14));
      }
      equipmentDiv.innerHTML = equipLines.join('<br>');
      textContainer.appendChild(equipmentDiv);

      // 🔧 QR CODE: Incluir problema/descrição na etiqueta - Layout vertical
      if (label.description && label.description.trim()) {
        const descriptionDiv = document.createElement('div');
        descriptionDiv.style.cssText = `
          font-size: 5.6pt;
          color: #888;
          font-style: italic;
          line-height: 1.2;
          word-wrap: break-word;
          max-width: 100%;
          white-space: normal;
        `;

        // 🔧 PROBLEMA: Filtrar repetição do nome do equipamento
        let problemText = label.description.trim();

        // Se o problema começa com o nome do equipamento, remover
        if (problemText.toLowerCase().startsWith(label.equipmentType.toLowerCase())) {
          problemText = problemText.substring(label.equipmentType.length).trim();
          // Remover pontuação inicial se houver
          problemText = problemText.replace(/^[:\-\s]+/, '');
        }

        // Quebrar texto em linhas de 14 caracteres
        const lines = [];
        for (let i = 0; i < problemText.length; i += 14) {
          lines.push(problemText.substring(i, i + 14));
        }

        // Criar HTML com quebras de linha
        descriptionDiv.innerHTML = `Problema:<br>${lines.join('<br>')}`;
        textContainer.appendChild(descriptionDiv);
      }



      if (label.printConfig.includeDate) {
        const dateDiv = document.createElement('div');
        dateDiv.style.cssText = `
          font-size: 5.6pt;
          color: #999;
          line-height: 1.2;
        `;
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

// 🧪 TESTE: Expor funções de teste globalmente (apenas em desenvolvimento)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).testQRPrint = {
    testLineBreak: QRPrintService.testLineBreak,
    createTestElement: QRPrintService.createTestElement,
    createTestLabel: QRPrintService.createTestLabel
  };
  console.log('🧪 [TESTE] Funções de teste disponíveis em window.testQRPrint');
}
