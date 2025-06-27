import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  MapPin, 
  Navigation, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Clock,
  Target,
  AlertCircle
} from 'lucide-react';
import { GeolocationService } from '@/services/geolocation/geolocationService';
import { 
  Coordinates, 
  LocationValidationConfig, 
  LocationValidationResult,
  getLocationConfigForService 
} from '@/types/geolocation';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';

interface LocationValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrder;
  onValidationSuccess: (location: Coordinates, wasOverridden?: boolean, reason?: string) => void;
  onValidationCancel: () => void;
}

export function LocationValidationDialog({
  open,
  onOpenChange,
  serviceOrder,
  onValidationSuccess,
  onValidationCancel
}: LocationValidationDialogProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null);
  const [validationResult, setValidationResult] = useState<LocationValidationResult | null>(null);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [config, setConfig] = useState<LocationValidationConfig | null>(null);

  useEffect(() => {
    if (open && serviceOrder) {
      console.log('🎯 [LocationValidationDialog] Modal aberto para ordem:', serviceOrder.id);

      // Configurar validação baseada no tipo de serviço
      const serviceConfig = getLocationConfigForService(
        serviceOrder.service_attendance_type || 'em_domicilio'
      );
      console.log('🎯 [LocationValidationDialog] Configuração de validação:', serviceConfig);
      setConfig(serviceConfig);

      // Iniciar processo de validação automaticamente
      console.log('🎯 [LocationValidationDialog] Iniciando obtenção de localização...');
      handleGetLocation();
    }
  }, [open, serviceOrder]);

  const handleGetLocation = async () => {
    console.log('🎯 [LocationValidationDialog] handleGetLocation iniciado');
    setIsGettingLocation(true);
    setCurrentLocation(null);
    setValidationResult(null);
    setShowOverrideForm(false);

    try {
      console.log('📍 [LocationValidationDialog] Obtendo localização atual...');
      const location = await GeolocationService.getCurrentPosition();
      console.log('✅ [LocationValidationDialog] Localização obtida:', location);
      setCurrentLocation(location);

      // Validar automaticamente após obter localização
      console.log('🔍 [LocationValidationDialog] Iniciando validação...');
      await validateLocation(location);

    } catch (error) {
      console.error('❌ [LocationValidationDialog] Erro ao obter localização:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao obter localização');
    } finally {
      console.log('🎯 [LocationValidationDialog] handleGetLocation finalizado');
      setIsGettingLocation(false);
    }
  };

  const validateLocation = async (location: Coordinates) => {
    if (!config) return;

    setIsValidating(true);
    try {
      console.log('🔍 Validando proximidade...');
      const result = await GeolocationService.validateProximity(
        location,
        serviceOrder.pickup_address || serviceOrder.client_address || '',
        config
      );
      
      setValidationResult(result);
      
      // Se válido, pode prosseguir automaticamente
      if (result.isValid) {
        toast.success(result.message);
      } else if (result.requiresConfirmation) {
        toast.warning(result.message);
      } else {
        toast.error(result.message);
      }
      
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.error('Erro ao validar localização');
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceed = () => {
    console.log('🎯 [LocationValidationDialog] handleProceed iniciado');
    console.log('🎯 [LocationValidationDialog] Estado atual:', {
      hasLocation: !!currentLocation,
      validationResult,
      canProceed: validationResult?.canProceed
    });

    if (!currentLocation) {
      console.log('❌ [LocationValidationDialog] Sem localização atual');
      return;
    }

    if (validationResult?.isValid) {
      // Localização válida - prosseguir normalmente
      console.log('✅ [LocationValidationDialog] Localização válida - prosseguindo');
      onValidationSuccess(currentLocation, false);
      onOpenChange(false);
    } else if (validationResult?.canProceed && validationResult?.requiresConfirmation) {
      // Requer confirmação - mostrar formulário de override
      console.log('⚠️ [LocationValidationDialog] Requer confirmação - mostrando formulário de override');
      setShowOverrideForm(true);
    } else {
      // Não pode prosseguir
      console.log('❌ [LocationValidationDialog] Não pode prosseguir');
      toast.error('Não é possível fazer check-in nesta localização');
    }
  };

  const handleOverride = () => {
    if (!currentLocation || !overrideReason.trim()) {
      toast.error('Digite o motivo para prosseguir');
      return;
    }

    onValidationSuccess(currentLocation, true, overrideReason.trim());
    onOpenChange(false);
    toast.success('Check-in realizado com override manual');
  };

  const handleCancel = () => {
    onValidationCancel();
    onOpenChange(false);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Validação de Localização
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do endereço */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Endereço de destino:</span>
                </div>
                <p className="text-sm text-gray-600 pl-6">
                  {serviceOrder.pickup_address || serviceOrder.client_address || 'Endereço não informado'}
                </p>
                <div className="flex items-center gap-2 pl-6">
                  <Badge variant="outline">
                    {config?.serviceType === 'em_domicilio' ? 'Serviço em Domicílio' : 'Coleta'}
                  </Badge>
                  <Badge variant="secondary">
                    Tolerância: {config?.tolerance}m
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status da localização */}
          <Card className={validationResult ? getSeverityColor(validationResult.severity) : ''}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {isGettingLocation ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : validationResult ? (
                    getSeverityIcon(validationResult.severity)
                  ) : (
                    <MapPin className="h-5 w-5 text-gray-600" />
                  )}
                  <span className="font-medium">
                    {isGettingLocation ? 'Obtendo localização...' : 
                     isValidating ? 'Validando proximidade...' :
                     validationResult ? 'Validação concluída' : 'Aguardando localização'}
                  </span>
                </div>

                {currentLocation && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>📍 Lat: {currentLocation.latitude.toFixed(6)}</div>
                    <div>📍 Lng: {currentLocation.longitude.toFixed(6)}</div>
                    {currentLocation.accuracy && (
                      <div>🎯 Precisão: ±{Math.round(currentLocation.accuracy)}m</div>
                    )}
                  </div>
                )}

                {validationResult && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{validationResult.message}</p>
                    {validationResult.distance > 0 && (
                      <div className="text-xs text-gray-600">
                        Distância: {Math.round(validationResult.distance)}m | 
                        Tolerância: {validationResult.tolerance}m
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formulário de override */}
          {showOverrideForm && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Confirmação necessária</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    A localização está fora da tolerância padrão. Digite o motivo para prosseguir:
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">Motivo:</Label>
                    <Textarea
                      id="override-reason"
                      placeholder="Ex: Cliente confirmou endereço correto, problema no GPS, etc."
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>

            {/* Botão de debug para pular validação */}
            <Button
              variant="secondary"
              onClick={() => {
                console.log('🎯 [LocationValidationDialog] Pulando validação para debug');
                const mockLocation: Coordinates = {
                  latitude: -27.5954,
                  longitude: -48.5480,
                  accuracy: 10,
                  timestamp: Date.now()
                };
                onValidationSuccess(mockLocation, true, 'Debug - Validação pulada');
                onOpenChange(false);
              }}
              className="bg-gray-500 hover:bg-gray-600"
            >
              Pular Validação (Debug)
            </Button>

            {!currentLocation ? (
              <Button
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="flex-1"
              >
                {isGettingLocation ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Obtendo localização...
                  </>
                ) : (
                  <>
                    <Navigation className="mr-2 h-4 w-4" />
                    Obter Localização
                  </>
                )}
              </Button>
            ) : showOverrideForm ? (
              <Button
                onClick={handleOverride}
                disabled={!overrideReason.trim()}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                Confirmar Override
              </Button>
            ) : (
              <Button
                onClick={handleProceed}
                disabled={!validationResult?.canProceed}
                className="flex-1"
              >
                {validationResult?.isValid ? 'Fazer Check-in' : 'Prosseguir Mesmo Assim'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
