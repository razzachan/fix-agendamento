import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCheckin } from '@/hooks/useCheckin';
import { useAuth } from '@/contexts/AuthContext';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Navigation,
  Timer
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CheckinButtonProps {
  serviceOrderId: string;
  className?: string;
  onCheckinComplete?: () => void;
  onCheckoutComplete?: () => void;
}

/**
 * Componente para gerenciar check-in e check-out de técnicos
 */
export const CheckinButton: React.FC<CheckinButtonProps> = ({
  serviceOrderId,
  className,
  onCheckinComplete,
  onCheckoutComplete
}) => {
  const { user } = useAuth();
  const {
    isLoading,
    activeCheckin,
    location,
    checkin,
    checkout,
    getCurrentLocation,
    validateProximity,
    getActiveCheckin,
    formatDuration,
    formatDistance
  } = useCheckin();

  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [workingTime, setWorkingTime] = useState<string>('');

  // Verificar check-in ativo ao montar o componente
  useEffect(() => {
    if (user?.id) {
      getActiveCheckin(serviceOrderId, user.id);
    }
  }, [serviceOrderId, user?.id, getActiveCheckin]);

  // Atualizar tempo de trabalho em tempo real
  useEffect(() => {
    if (!activeCheckin?.checkin_timestamp || activeCheckin.checkout_timestamp) {
      return;
    }

    const updateWorkingTime = () => {
      const checkinTime = new Date(activeCheckin.checkin_timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - checkinTime.getTime()) / (1000 * 60);
      setWorkingTime(formatDuration(diffMinutes));
    };

    updateWorkingTime();
    const interval = setInterval(updateWorkingTime, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [activeCheckin, formatDuration]);

  /**
   * Fazer check-in
   */
  const handleCheckin = async () => {
    if (!user?.id) return;

    try {
      // Validar proximidade (opcional)
      const isNearby = await validateProximity(serviceOrderId, 500); // 500m de tolerância
      
      if (!isNearby) {
        // Usuário pode escolher continuar mesmo estando longe
        const confirm = window.confirm(
          'Você está distante do endereço da ordem. Deseja continuar mesmo assim?'
        );
        if (!confirm) return;
      }

      const result = await checkin(serviceOrderId, user.id);
      if (result && onCheckinComplete) {
        onCheckinComplete();
      }
    } catch (error) {
      console.error('Erro no check-in:', error);
    }
  };

  /**
   * Fazer check-out
   */
  const handleCheckout = async () => {
    if (!activeCheckin?.id) return;

    try {
      const result = await checkout(activeCheckin.id);
      if (result && onCheckoutComplete) {
        onCheckoutComplete();
      }
    } catch (error) {
      console.error('Erro no check-out:', error);
    }
  };

  /**
   * Obter localização atual
   */
  const handleGetLocation = async () => {
    await getCurrentLocation();
    setShowLocationDetails(true);
  };

  // Se não há check-in ativo, mostrar botão de check-in
  if (!activeCheckin || activeCheckin.checkout_timestamp) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            Check-in no Local
          </CardTitle>
          <CardDescription>
            Registre sua chegada no local de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informações de localização */}
          {location && showLocationDetails && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Navigation className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-900">Localização Atual:</p>
                  <p className="text-blue-700 mt-1">{location.address || 'Endereço não disponível'}</p>
                  <p className="text-blue-600 text-xs mt-1">
                    Precisão: {Math.round(location.accuracy)}m
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              onClick={handleCheckin}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fazendo Check-in...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Fazer Check-in
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleGetLocation}
              disabled={isLoading}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>

          {/* Informações adicionais */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• O check-in registra sua localização atual</p>
            <p>• Certifique-se de estar próximo ao local de atendimento</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se há check-in ativo, mostrar informações e botão de check-out
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Timer className="h-5 w-5 text-green-600" />
          Em Atendimento
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Ativo
          </Badge>
        </CardTitle>
        <CardDescription>
          Check-in realizado - Você está no local de atendimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações do check-in */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Check-in:</span>
            </div>
            <p className="font-medium">
              {new Date(activeCheckin.checkin_timestamp).toLocaleTimeString('pt-BR')}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(activeCheckin.checkin_timestamp), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Timer className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Tempo:</span>
            </div>
            <p className="font-medium text-green-600">
              {workingTime || 'Calculando...'}
            </p>
            <p className="text-xs text-gray-500">
              Tempo de atendimento
            </p>
          </div>
        </div>

        {/* Localização do check-in */}
        {activeCheckin.checkin_address && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-green-900">Local do Check-in:</p>
                <p className="text-green-700 mt-1">{activeCheckin.checkin_address}</p>
                {activeCheckin.distance_from_address_meters && (
                  <p className="text-green-600 text-xs mt-1">
                    Distância do endereço: {formatDistance(activeCheckin.distance_from_address_meters)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botão de check-out */}
        <Button
          onClick={handleCheckout}
          disabled={isLoading}
          variant="destructive"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Fazendo Check-out...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Fazer Check-out
            </>
          )}
        </Button>

        {/* Informações adicionais */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• O check-out registra o fim do atendimento</p>
          <p>• O tempo total será calculado automaticamente</p>
        </div>
      </CardContent>
    </Card>
  );
};
