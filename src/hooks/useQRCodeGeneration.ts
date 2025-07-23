/**
 * Hook para geração de QR Codes
 */

import { useState, useCallback } from 'react';
import { QRCodeService } from '@/services/qrcode/qrCodeService';
import { QRPrintService } from '@/services/qrcode/qrPrintService';
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
   * Imprime etiqueta
   */
  const printLabel = useCallback(async (label: QRCodeLabel): Promise<boolean> => {
    setIsPrinting(true);
    setError(null);

    try {
      console.log('🖨️ [useQRCodeGeneration] Iniciando impressão');
      
      const success = await QRPrintService.printLabel(label);
      
      if (success) {
        toast.success('Impressão iniciada!');
        
        // Incrementar contador de impressões
        const qrCodeData = await QRCodeService.getActiveQRCodeByServiceOrder(label.orderNumber);
        if (qrCodeData) {
          await QRCodeService.incrementPrintCount(qrCodeData.id);
        }
      } else {
        toast.error('Erro ao iniciar impressão');
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
   * Baixa etiqueta como PDF
   */
  const downloadLabel = useCallback(async (label: QRCodeLabel): Promise<void> => {
    setError(null);

    try {
      console.log('💾 [useQRCodeGeneration] Iniciando download');
      
      await QRPrintService.downloadLabel(label);
      
      toast.success('Download iniciado!');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao baixar etiqueta';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ [useQRCodeGeneration] Erro ao baixar:', err);
      throw err;
    }
  }, []);

  return {
    generateQRCode,
    generateLabel,
    printLabel,
    downloadLabel,
    isGenerating,
    isGeneratingLabel,
    isPrinting,
    error
  };
}

export default useQRCodeGeneration;
