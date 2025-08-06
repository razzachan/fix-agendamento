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
import ThermalPrintService from '@/services/qrcode/thermalPrintService';
import ThermalPrintInfo from './ThermalPrintInfo';
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
    downloadLabelAsPDF,
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
      // 🔧 CALENDÁRIO: Debug detalhado para identificar diferenças entre contextos
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [QRCodeGenerator] serviceOrder recebido:', serviceOrder);
        console.log('🔍 [QRCodeGenerator] user:', user);
      }

      // 🔧 CALENDÁRIO: Tratamento robusto dos dados
      const qrCodeRequest = {
        serviceOrderId: serviceOrder.id,
        equipmentSerial: serviceOrder.equipmentSerial || undefined,
        generatedBy: user.id,
        location: (() => {
          // Tentar diferentes formatos de endereço
          const possibleLocation =
            serviceOrder.pickupAddress ||
            serviceOrder.pickup_address ||
            serviceOrder.address ||
            serviceOrder.endereco ||
            'Cliente';

          if (process.env.NODE_ENV === 'development') {
            console.log('🔍 [QRCodeGenerator] location determinada:', possibleLocation);
          }

          return possibleLocation;
        })()
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [QRCodeGenerator] qrCodeRequest:', qrCodeRequest);
      }

      const qrCode = await generateQRCode(qrCodeRequest);

      console.log('🎯 [QRCodeGenerator] QR Code gerado:', qrCode);
      setGeneratedQRCode(qrCode);

      // Chamar callback IMEDIATAMENTE após gerar o QR Code
      console.log('🎯 [QRCodeGenerator] Chamando onQRCodeGenerated callback');
      onQRCodeGenerated?.(qrCode);

      // Gerar etiqueta automaticamente (não bloquear o callback)
      try {
        await handleGenerateLabel(qrCode.qrCode);
      } catch (labelError) {
        console.warn('⚠️ [QRCodeGenerator] Erro ao gerar etiqueta (não crítico):', labelError);
        // Não falhar se a etiqueta der erro
      }

    } catch (error) {
      console.error('❌ [QRCodeGenerator] Erro ao gerar QR Code:', error);
      // 🔧 PRODUÇÃO: Erro mais detalhado para debug
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [QRCodeGenerator] Detalhes do erro:', errorMessage);
      toast.error(`Erro ao gerar QR Code: ${errorMessage}`);
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
   * Imprime etiqueta (método padrão - inclui térmica)
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
   * Força impressão térmica Bluetooth
   */
  const handleThermalPrint = async () => {
    if (!generatedLabel) {
      toast.error('Etiqueta não gerada');
      return;
    }

    try {
      const success = await ThermalPrintService.printThermalLabel(generatedLabel);
      if (!success) {
        toast.error('Impressão térmica não disponível');
      }
    } catch (error) {
      console.error('Erro na impressão térmica:', error);
      toast.error('Erro na impressão térmica');
    }
  };

  /**
   * Baixa etiqueta como PNG (padrão - melhor para mobile)
   */
  const handleDownloadLabel = async () => {
    if (!generatedLabel) {
      toast.error('Etiqueta não gerada');
      return;
    }

    try {
      await downloadLabel(generatedLabel);
    } catch (error) {
      console.error('Erro ao baixar etiqueta PNG:', error);
    }
  };

  /**
   * Baixa etiqueta como PDF (alternativa)
   */
  const handleDownloadPDF = async () => {
    if (!generatedLabel) {
      toast.error('Etiqueta não gerada');
      return;
    }

    try {
      await downloadLabelAsPDF(generatedLabel);
    } catch (error) {
      console.error('Erro ao baixar etiqueta PDF:', error);
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

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">🏷️ Etiqueta Pronta para Impressão!</span>
              </div>

              {/* Prévia da Etiqueta - Compacta */}
              <div className="bg-white border-2 border-dashed border-gray-300 p-2 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2">📄 Prévia da Etiqueta (58mm x 40mm)</p>

                  {/* Layout da etiqueta - Vertical */}
                  <div className="bg-white border border-gray-400 p-3 mx-auto inline-block" style={{ width: '140px' }}>
                    <div className="flex flex-col items-center text-center space-y-1">
                      {/* QR Code - Centralizado */}
                      <div className="mb-1">
                        <img
                          src={generatedLabel.qrCodeData}
                          alt="QR Code"
                          className="border border-gray-300 mx-auto"
                          style={{
                            width: '48px',
                            height: '48px',
                            objectFit: 'contain'
                          }}
                        />
                      </div>

                      {/* Informações - Centralizadas */}
                      <div className="space-y-0.5 w-full">
                        <div className="text-sm font-bold text-gray-800">
                          {generatedLabel.orderNumber}
                        </div>
                        <div className="text-xs text-gray-700 leading-tight">
                          {generatedLabel.clientName.substring(0, 18)}{generatedLabel.clientName.length > 18 ? '...' : ''}
                        </div>
                        <div className="text-xs text-gray-600 leading-tight">
                          {generatedLabel.equipmentType.substring(0, 20)}{generatedLabel.equipmentType.length > 20 ? '...' : ''}
                        </div>
                        {/* 🔧 QR CODE: Mostrar problema na prévia - Filtrado */}
                        {generatedLabel.description && generatedLabel.description.trim() && (
                          <div className="text-xs text-gray-500 italic leading-tight">
                            Problema: {(() => {
                              // 🔧 PROBLEMA: Filtrar repetição do nome do equipamento
                              let problemText = generatedLabel.description.trim();

                              // Se o problema começa com o nome do equipamento, remover
                              if (problemText.toLowerCase().startsWith(generatedLabel.equipmentType.toLowerCase())) {
                                problemText = problemText.substring(generatedLabel.equipmentType.length).trim();
                                // Remover pontuação inicial se houver
                                problemText = problemText.replace(/^[:\-\s]+/, '');
                              }

                              // Limitar a 25 caracteres para a prévia vertical
                              return problemText.length > 25
                                ? `${problemText.substring(0, 25)}...`
                                : problemText;
                            })()}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 leading-tight">
                          {generatedLabel.generatedDate}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg">
                <p className="text-xs text-blue-700 mb-2">
                  ✅ Etiqueta gerada com sucesso! Agora você pode imprimir ou baixar.
                </p>
                {/* 🔧 IMPRESSÃO TÉRMICA: Botões adaptativos para mobile/desktop */}
                {ThermalPrintService.isMobileEnvironment() ? (
                  // Mobile: Priorizar impressão térmica
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleThermalPrint}
                        disabled={isPrinting}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isPrinting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4 mr-2" />
                        )}
                        📱 Térmica
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadLabel}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        📱 PNG
                      </Button>
                    </div>

                    {/* Botão secundário para impressão padrão */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrintLabel}
                      disabled={isPrinting}
                      className="w-full text-xs text-gray-600"
                    >
                      🖨️ Impressão Padrão (Navegador)
                    </Button>
                  </div>
                ) : (
                  // Desktop: Layout tradicional
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

                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadLabel}
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        📱 PNG
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadPDF}
                        className="text-xs text-gray-600 hover:bg-gray-100"
                      >
                        📄 PDF
                      </Button>
                    </div>
                  </div>
                )}
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

        {/* 🔧 IMPRESSÃO TÉRMICA: Informações para técnicos */}
        {ThermalPrintService.isMobileEnvironment() && (
          <ThermalPrintInfo className="mt-4" />
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeGenerator;
