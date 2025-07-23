/**
 * Componente para geração de QR Code e etiquetas
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  QrCode, 
  Printer, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import { EquipmentQRCode, QRCodeLabel } from '@/types/qrcode';
import { useQRCodeGeneration } from '@/hooks/useQRCodeGeneration';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface QRCodeGeneratorProps {
  serviceOrder: ServiceOrder;
  onQRCodeGenerated?: (qrCode: EquipmentQRCode) => void;
  className?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  serviceOrder,
  onQRCodeGenerated,
  className
}) => {
  const { user } = useAuth();
  const [generatedQRCode, setGeneratedQRCode] = useState<EquipmentQRCode | null>(null);
  const [generatedLabel, setGeneratedLabel] = useState<QRCodeLabel | null>(null);
  
  const {
    generateQRCode,
    generateLabel,
    printLabel,
    downloadLabel,
    isGenerating,
    isGeneratingLabel,
    isPrinting,
    error
  } = useQRCodeGeneration();

  /**
   * Gera QR Code para a ordem de serviço
   */
  const handleGenerateQRCode = async () => {
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const qrCode = await generateQRCode({
        serviceOrderId: serviceOrder.id,
        equipmentSerial: serviceOrder.equipmentSerial || undefined,
        generatedBy: user.id,
        location: serviceOrder.pickupAddress || 'Cliente'
      });

      setGeneratedQRCode(qrCode);
      onQRCodeGenerated?.(qrCode);

      // Gerar etiqueta automaticamente
      await handleGenerateLabel(qrCode.qrCode);

    } catch (error) {
      console.error('❌ [QRCodeGenerator] Erro ao gerar QR Code:', error);
      // 🔧 PRODUÇÃO: Não quebrar a interface, apenas mostrar erro
      toast.error('Erro ao gerar QR Code. Tente novamente.');
    }
  };

  /**
   * Gera etiqueta para impressão
   */
  const handleGenerateLabel = async (qrCode?: string) => {
    const codeToUse = qrCode || generatedQRCode?.qrCode;

    if (!codeToUse) {
      toast.error('QR Code não encontrado');
      return;
    }

    try {
      const label = await generateLabel(serviceOrder, codeToUse);

      if (label) {
        setGeneratedLabel(label);
      } else {
        console.warn('⚠️ [QRCodeGenerator] Etiqueta não gerada');
        toast.error('Erro ao gerar etiqueta - resultado nulo');
      }
    } catch (error) {
      console.error('❌ [QRCodeGenerator] Erro ao gerar etiqueta:', error);
      // 🔧 PRODUÇÃO: Erro mais genérico para não quebrar a interface
      toast.error('Erro ao gerar etiqueta. Tente novamente.');
    }
  };

  /**
   * Imprime etiqueta
   */
  const handlePrintLabel = async () => {
    if (!generatedLabel) {
      toast.error('Etiqueta não gerada');
      return;
    }

    try {
      await printLabel(generatedLabel);
    } catch (error) {
      console.error('Erro ao imprimir etiqueta:', error);
    }
  };

  /**
   * Baixa etiqueta como PDF
   */
  const handleDownloadLabel = async () => {
    if (!generatedLabel) {
      toast.error('Etiqueta não gerada');
      return;
    }

    try {
      await downloadLabel(generatedLabel);
    } catch (error) {
      console.error('Erro ao baixar etiqueta:', error);
    }
  };

  // Verificar se é tipo de serviço que precisa de QR Code
  const needsQRCode = ['coleta_conserto', 'coleta_diagnostico'].includes(
    serviceOrder.serviceAttendanceType
  );

  if (!needsQRCode) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>QR Code não necessário para este tipo de serviço</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Rastreamento por QR Code
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações da OS */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ordem de Serviço:</span>
            <span className="font-medium font-mono text-blue-600">
              {serviceOrder.orderNumber || `OS #${serviceOrder.id.substring(0, 8).toUpperCase()}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium">{serviceOrder.clientName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Equipamento:</span>
            <span className="font-medium">{serviceOrder.equipmentType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tipo de Serviço:</span>
            <Badge variant="outline" className="text-xs">
              {serviceOrder.serviceAttendanceType === 'coleta_conserto' ? 'Coleta Conserto' :
               serviceOrder.serviceAttendanceType === 'coleta_diagnostico' ? 'Coleta Diagnóstico' :
               serviceOrder.serviceAttendanceType === 'em_domicilio' ? 'Em Domicílio' :
               serviceOrder.serviceAttendanceType}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Status do QR Code */}
        {generatedQRCode ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">✅ QR Code Gerado com Sucesso!</span>
            </div>

            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="text-xs text-green-700 mb-1 font-medium">Código QR:</div>
              <div className="font-mono text-sm break-all text-green-800">{generatedQRCode.qrCode}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span>Gerado em:</span>
                <div>{new Date(generatedQRCode.generatedAt).toLocaleString('pt-BR')}</div>
              </div>
              <div>
                <span>Impressões:</span>
                <div>{generatedQRCode.printCount}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Button
              onClick={handleGenerateQRCode}
              disabled={isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  🏷️ Gerar QR Code de Rastreamento
                </>
              )}
            </Button>
          </div>
        )}

        {/* Status da geração de etiqueta */}
        {generatedQRCode && !generatedLabel && !isGeneratingLabel && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Etiqueta não gerada</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateLabel()}
              className="w-full"
            >
              Gerar Etiqueta
            </Button>
          </div>
        )}

        {/* Loading da etiqueta */}
        {isGeneratingLabel && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Gerando etiqueta...</span>
            </div>
          </div>
        )}

        {/* Ações de impressão */}
        {generatedLabel && (
          <>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">🏷️ Etiqueta Pronta para Impressão!</span>
              </div>

              {/* Prévia da Etiqueta */}
              <div className="bg-white border-2 border-dashed border-gray-300 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-3">📄 Prévia da Etiqueta (62mm x 29mm)</p>

                  {/* Layout da etiqueta */}
                  <div className="bg-white border border-gray-400 p-3 mx-auto max-w-sm" style={{ aspectRatio: '62/29' }}>
                    <div className="flex items-center gap-3 h-full">
                      {/* QR Code */}
                      <div className="flex-shrink-0">
                        <img
                          src={generatedLabel.qrCodeData}
                          alt="QR Code"
                          className="w-16 h-16 border border-gray-300"
                        />
                      </div>

                      {/* Informações */}
                      <div className="flex-1 text-left space-y-1">
                        <div className="text-xs font-bold text-gray-800">
                          {generatedLabel.orderNumber}
                        </div>
                        <div className="text-xs text-gray-700 leading-tight">
                          {generatedLabel.clientName}
                        </div>
                        <div className="text-xs text-gray-600 leading-tight">
                          {generatedLabel.equipmentType}
                        </div>
                        <div className="text-xs text-gray-500">
                          {generatedLabel.generatedDate}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <p className="text-xs text-blue-700 mb-3">
                  ✅ Etiqueta gerada com sucesso! Agora você pode imprimir ou baixar.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintLabel}
                    disabled={isPrinting}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    {isPrinting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Printer className="w-4 h-4 mr-2" />
                    )}
                    🖨️ Imprimir
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadLabel}
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    📥 Baixar PDF
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}



        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Instruções */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Instruções:</strong></p>
          <p>1. Gere o QR Code após coletar o equipamento</p>
          <p>2. Imprima a etiqueta e cole no equipamento</p>
          <p>3. Use o scanner para rastrear a localização</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
