/**
 * Hook para geração de QR Codes
 */

import { useState, useCallback } from 'react';
import { QRCodeService } from '@/services/qrcode/qrCodeService';
import { QRPrintService } from '@/services/qrcode/qrPrintService';
import ThermalPrintService from '@/services/qrcode/thermalPrintService';
import NodeThermalPrintService from '@/services/qrcode/nodeThermalPrintService';
import {
  EquipmentQRCode,
  QRCodeGenerationRequest,
  QRCodeLabel,
  UseQRCodeGenerationReturn
} from '@/types/qrcode';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';

export function useQRCodeGeneration(): UseQRCodeGenerationReturn & {
  generateLabel: (serviceOrder: ServiceOrder, qrCode: string) => Promise<QRCodeLabel | null>;
  printLabel: (label: QRCodeLabel) => Promise<boolean>;
  downloadLabel: (label: QRCodeLabel) => Promise<void>;
  downloadLabelAsPDF: (label: QRCodeLabel) => Promise<void>;
  isGeneratingLabel: boolean;
  isPrinting: boolean;
} {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Gera QR Code para uma ordem de serviço
   */
  const generateQRCode = useCallback(async (request: QRCodeGenerationRequest): Promise<EquipmentQRCode> => {
    setIsGenerating(true);
    setError(null);

    try {
      // 🔧 PRODUÇÃO: Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('🏷️ [useQRCodeGeneration] Iniciando geração de QR Code');
      }

      const qrCode = await QRCodeService.generateQRCode(request);

      toast.success('QR Code gerado com sucesso!');

      // 🔧 PRODUÇÃO: Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ [useQRCodeGeneration] QR Code gerado:', qrCode.qrCode);
      }

      return qrCode;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar QR Code';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeGeneration] Erro:', err);
      throw err;

    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Gera etiqueta para impressão
   */
  const generateLabel = useCallback(async (
    serviceOrder: ServiceOrder, 
    qrCode: string
  ): Promise<QRCodeLabel | null> => {
    setIsGeneratingLabel(true);
    setError(null);

    try {
      console.log('🏷️ [useQRCodeGeneration] Gerando etiqueta para impressão');
      
      const label = await QRPrintService.generateLabel(serviceOrder, qrCode);
      
      toast.success('Etiqueta gerada com sucesso!');
      console.log('✅ [useQRCodeGeneration] Etiqueta gerada');
      
      return label;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar etiqueta';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeGeneration] Erro ao gerar etiqueta:', err);
      return null;

    } finally {
      setIsGeneratingLabel(false);
    }
  }, []);

  /**
   * Imprime etiqueta - com suporte térmico
   */
  const printLabel = useCallback(async (label: QRCodeLabel): Promise<boolean> => {
    setIsPrinting(true);
    setError(null);

    try {
      console.log('🖨️ [useQRCodeGeneration] Iniciando impressão');

      let success = false;

      // 🔧 PRIORIDADE 1: Serviço Node.js (melhor para desktop/técnicos)
      const nodeServiceAvailable = await NodeThermalPrintService.isServiceAvailable();
      if (nodeServiceAvailable) {
        console.log('🖥️ [useQRCodeGeneration] Usando serviço Node.js...');
        success = await NodeThermalPrintService.printLabel(label);

        if (success) {
          toast.success('Etiqueta impressa via serviço local!');
        }
      }

      // 🔧 PRIORIDADE 2: Impressão térmica mobile (se Node.js falhou)
      if (!success) {
        console.log('📱 [useQRCodeGeneration] Tentando impressão térmica mobile...');
        const thermalSuccess = await ThermalPrintService.printThermalLabel(label);

        if (thermalSuccess) {
          success = true;
          toast.success('Etiqueta impressa em impressora térmica!');
        }
      }

      // 🔧 PRIORIDADE 3: Fallback para impressão padrão
      if (!success) {
        console.log('🖨️ [useQRCodeGeneration] Usando impressão padrão...');
        success = await QRPrintService.printLabel(label);

        if (success) {
          toast.success('Impressão iniciada no navegador!');
        } else {
          toast.error('Erro ao iniciar impressão');
        }
      }

      // Incrementar contador de impressões se bem-sucedido
      if (success) {
        const qrCodeData = await QRCodeService.getActiveQRCodeByServiceOrder(label.serviceOrderId);
        if (qrCodeData) {
          await QRCodeService.incrementPrintCount(qrCodeData.id);
        }
      }

      return success;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao imprimir etiqueta';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeGeneration] Erro ao imprimir:', err);
      return false;

    } finally {
      setIsPrinting(false);
    }
  }, []);

  /**
   * Baixa etiqueta como PNG (padrão - melhor para mobile)
   */
  const downloadLabel = useCallback(async (label: QRCodeLabel): Promise<void> => {
    setError(null);

    try {
      console.log('💾 [useQRCodeGeneration] Iniciando download PNG');

      await QRPrintService.downloadLabel(label);

      toast.success('📱 Imagem PNG baixada!', {
        description: 'Abra na galeria e compartilhe com seu app de impressão'
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao baixar etiqueta';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeGeneration] Erro ao baixar PNG:', err);
      throw err;
    }
  }, []);

  /**
   * Baixa etiqueta como PDF (alternativa)
   */
  const downloadLabelAsPDF = useCallback(async (label: QRCodeLabel): Promise<void> => {
    setError(null);

    try {
      console.log('💾 [useQRCodeGeneration] Iniciando download PDF');

      await QRPrintService.downloadLabelAsPDF(label);

      toast.success('📄 PDF baixado!');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao baixar PDF';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeGeneration] Erro ao baixar PDF:', err);
      throw err;
    }
  }, []);

  return {
    generateQRCode,
    generateLabel,
    printLabel,
    downloadLabel,
    downloadLabelAsPDF,
    isGenerating,
    isGeneratingLabel,
    isPrinting,
    error
  };
}

export default useQRCodeGeneration;
