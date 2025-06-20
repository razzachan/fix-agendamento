import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  AlertCircle,
  Truck,
  Wrench,
  Home,
  QrCode,
  ExternalLink
} from 'lucide-react';
import QRCodeService from '@/services/qrcode/qrCodeService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrackingInfo {
  isValid: boolean;
  error?: string;
  equipmentQRCode?: any;
  serviceOrder?: any;
  trackingEvents?: any[];
}

export default function TrackingPage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (qrCode) {
      loadTrackingInfo();
    }
  }, [qrCode]);

  const loadTrackingInfo = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 [TrackingPage] Carregando informações para QR Code:', qrCode);
      
      // Validar QR Code
      const validation = await QRCodeService.validateQRCode(qrCode!);
      
      if (validation.isValid && validation.equipmentQRCode) {
        // Buscar informações da OS
        // TODO: Implementar busca da OS pelo ID
        setTrackingInfo({
          isValid: true,
          equipmentQRCode: validation.equipmentQRCode,
          serviceOrder: null, // Será implementado
          trackingEvents: [] // Será implementado
        });
      } else {
        setTrackingInfo({
          isValid: false,
          error: validation.error || 'QR Code inválido'
        });
      }
    } catch (error) {
      console.error('❌ [TrackingPage] Erro ao carregar informações:', error);
      setTrackingInfo({
        isValid: false,
        error: 'Erro ao carregar informações de rastreamento'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="h-4 w-4" />;
      case 'on_the_way': return <Truck className="h-4 w-4" />;
      case 'collected': return <Package className="h-4 w-4" />;
      case 'at_workshop': return <Wrench className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'on_the_way': return 'A Caminho';
      case 'collected': return 'Coletado';
      case 'at_workshop': return 'Na Oficina';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const getLocationIcon = (location: string) => {
    switch (location) {
      case 'client': return <Home className="h-4 w-4" />;
      case 'workshop': return <Wrench className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getLocationLabel = (location: string) => {
    switch (location) {
      case 'client': return 'Com o Cliente';
      case 'workshop': return 'Na Oficina';
      case 'delivered': return 'Entregue';
      default: return location;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E5B034] mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações de rastreamento...</p>
        </div>
      </div>
    );
  }

  if (!trackingInfo?.isValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">QR Code Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">
              {trackingInfo?.error || 'Este QR Code não foi encontrado ou está inativo.'}
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="w-full"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { equipmentQRCode } = trackingInfo;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#E5B034] text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <QrCode className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Rastreamento de Equipamento</h1>
              <p className="text-yellow-100">Fix Fogões - Assistência Técnica</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Informações do QR Code */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Informações do Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Código de Rastreamento</p>
                <p className="font-mono text-lg font-semibold">{equipmentQRCode.qrCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status Atual</p>
                <Badge variant="outline" className="mt-1">
                  {getStatusIcon(equipmentQRCode.status)}
                  <span className="ml-2">{equipmentQRCode.status}</span>
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Localização Atual</p>
                <div className="flex items-center gap-2 mt-1">
                  {getLocationIcon(equipmentQRCode.currentLocation)}
                  <span>{getLocationLabel(equipmentQRCode.currentLocation)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gerado em</p>
                <p>{format(new Date(equipmentQRCode.generatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações de Contato */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Precisa de Ajuda?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <Button 
                  variant="outline" 
                  className="mt-2 w-full"
                  onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Falar no WhatsApp
                </Button>
              </div>
              <div>
                <p className="text-sm text-gray-600">Site</p>
                <Button 
                  variant="outline" 
                  className="mt-2 w-full"
                  onClick={() => window.open('https://fix-fogoes.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visitar Site
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-center text-gray-500 text-sm">
          <p>© 2025 Fix Fogões - Assistência Técnica Especializada</p>
          <p className="mt-1">Sistema de Rastreamento por QR Code</p>
        </div>
      </div>
    </div>
  );
}
