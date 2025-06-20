import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Copy,
  Eye,
  Loader2
} from 'lucide-react';
import { ServiceOrder } from '@/types';
import { EquipmentQRCode, QRCodeLabel } from '@/types/qrcode';
import { QRCodeService } from '@/services/qrcode/qrCodeService';
import { useQRCodeGeneration } from '@/hooks/useQRCodeGeneration';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

interface QRCodeDisplayProps {
  serviceOrder: ServiceOrder;
  className?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  serviceOrder,
  className
}) => {
  const { user } = useAuth();
  const [existingQRCode, setExistingQRCode] = useState<EquipmentQRCode | null>(null);
  const [qrCodeImage, setQRCodeImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  
  const {
    generateLabel,
    printLabel,
    downloadLabel,
    isGeneratingLabel,
    isPrinting,
    error
  } = useQRCodeGeneration();

  // Verificar se este tipo de serviço precisa de QR Code
  const needsQRCode = serviceOrder.serviceAttendanceType === 'coleta_conserto' || 
                      serviceOrder.serviceAttendanceType === 'coleta_diagnostico';

  useEffect(() => {
    if (needsQRCode) {
      loadExistingQRCode();
    } else {
      setIsLoading(false);
    }
  }, [serviceOrder.id, needsQRCode]);

  const loadExistingQRCode = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 [QRCodeDisplay] Buscando QR Code existente para OS:', serviceOrder.id);
      
      const qrCode = await QRCodeService.getActiveQRCodeByServiceOrder(serviceOrder.id);
      
      if (qrCode) {
        setExistingQRCode(qrCode);
        console.log('✅ [QRCodeDisplay] QR Code encontrado:', qrCode.qrCode);
        
        // Gerar imagem do QR Code
        await generateQRCodeImage(qrCode.qrCode);
      } else {
        console.log('ℹ️ [QRCodeDisplay] Nenhum QR Code encontrado para esta OS');
      }
    } catch (error) {
      console.error('❌ [QRCodeDisplay] Erro ao buscar QR Code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCodeImage = async (qrCodeText: string) => {
    try {
      // Gerar URL de rastreamento
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://192.168.0.10:8081';
      const trackingUrl = `${baseUrl}/track/${qrCodeText}`;
      
      const qrCodeDataURL = await QRCodeLib.toDataURL(trackingUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQRCodeImage(qrCodeDataURL);
    } catch (error) {
      console.error('❌ [QRCodeDisplay] Erro ao gerar imagem do QR Code:', error);
    }
  };

  const handleCopyQRCode = () => {
    if (existingQRCode) {
      navigator.clipboard.writeText(existingQRCode.qrCode);
      toast.success('Código QR copiado para a área de transferência!');
    }
  };

  const handleCopyTrackingURL = () => {
    if (existingQRCode) {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://192.168.0.10:8081';
      const trackingUrl = `${baseUrl}/track/${existingQRCode.qrCode}`;
      navigator.clipboard.writeText(trackingUrl);
      toast.success('URL de rastreamento copiada!');
    }
  };

  const handleOpenTrackingPage = () => {
    if (existingQRCode) {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'http://192.168.0.10:8081';
      const trackingUrl = `${baseUrl}/track/${existingQRCode.qrCode}`;
      window.open(trackingUrl, '_blank');
    }
  };

  const handleGenerateLabel = async () => {
    if (!existingQRCode) return;

    try {
      const label = await generateLabel(serviceOrder, existingQRCode.qrCode);
      if (label) {
        toast.success('Etiqueta gerada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Verificando QR Code...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  if (!existingQRCode) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum QR Code gerado para esta ordem de serviço</p>
            <p className="text-xs mt-1">Use o gerador de QR Code para criar um novo</p>
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
          QR Code de Rastreamento
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">✅ QR Code Ativo</span>
        </div>

        {/* Informações do QR Code */}
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
          <div className="text-xs text-green-700 mb-1 font-medium">Código QR:</div>
          <div className="font-mono text-sm break-all text-green-800 mb-2">{existingQRCode.qrCode}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyQRCode}
            className="text-xs"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copiar Código
          </Button>
        </div>

        {/* QR Code Visual */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowQRCode(!showQRCode)}
            className="mb-3"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showQRCode ? 'Ocultar' : 'Mostrar'} QR Code
          </Button>

          {showQRCode && qrCodeImage && (
            <div className="bg-white p-4 border rounded-lg inline-block">
              <img 
                src={qrCodeImage} 
                alt="QR Code de Rastreamento" 
                className="mx-auto"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Escaneie para rastrear o equipamento
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Informações Detalhadas */}
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Gerado em:</span>
            <div>{new Date(existingQRCode.generatedAt).toLocaleString('pt-BR')}</div>
          </div>
          <div>
            <span className="font-medium">Status:</span>
            <div className="capitalize">{existingQRCode.status}</div>
          </div>
          <div>
            <span className="font-medium">Localização:</span>
            <div className="capitalize">{existingQRCode.currentLocation}</div>
          </div>
          <div>
            <span className="font-medium">Impressões:</span>
            <div>{existingQRCode.printCount}</div>
          </div>
        </div>

        <Separator />

        {/* Ações */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenTrackingPage}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Abrir Rastreamento
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTrackingURL}
              className="text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copiar URL
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateLabel}
              disabled={isGeneratingLabel}
              className="text-xs"
            >
              {isGeneratingLabel ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Printer className="w-3 h-3 mr-1" />
              )}
              Gerar Etiqueta
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs opacity-50"
            >
              <Download className="w-3 h-3 mr-1" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
