import { useState, useCallback } from 'react';
import { CheckinService, CheckinData, GeolocationData } from '@/services/checkinService';
import { useToast } from '@/hooks/use-toast';

export interface UseCheckinReturn {
  // Estados
  isLoading: boolean;
  activeCheckin: CheckinData | null;
  location: GeolocationData | null;
  
  // Ações
  checkin: (serviceOrderId: string, technicianId: string) => Promise<CheckinData | null>;
  checkout: (checkinId: string) => Promise<CheckinData | null>;
  getCurrentLocation: () => Promise<GeolocationData | null>;
  validateProximity: (serviceOrderId: string, maxDistance?: number) => Promise<boolean>;
  getActiveCheckin: (serviceOrderId: string, technicianId: string) => Promise<CheckinData | null>;
  
  // Utilitários
  formatDuration: (minutes: number) => string;
  formatDistance: (meters: number) => string;
}

/**
 * Hook para gerenciar check-in e check-out de técnicos
 */
export function useCheckin(): UseCheckinReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [activeCheckin, setActiveCheckin] = useState<CheckinData | null>(null);
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const { toast } = useToast();

  /**
   * Obter localização atual
   */
  const getCurrentLocation = useCallback(async (): Promise<GeolocationData | null> => {
    try {
      setIsLoading(true);
      const locationData = await CheckinService.getCurrentLocation();
      setLocation(locationData);
      return locationData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao obter localização';
      toast({
        title: "Erro de Localização",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Fazer check-in
   */
  const checkin = useCallback(async (
    serviceOrderId: string, 
    technicianId: string
  ): Promise<CheckinData | null> => {
    try {
      setIsLoading(true);

      // Verificar se já existe check-in ativo
      const existingCheckin = await CheckinService.getActiveCheckin(serviceOrderId, technicianId);
      if (existingCheckin) {
        toast({
          title: "Check-in já realizado",
          description: "Você já fez check-in nesta ordem de serviço",
          variant: "destructive"
        });
        setActiveCheckin(existingCheckin);
        return existingCheckin;
      }

      // Realizar check-in
      const checkinData = await CheckinService.checkin(serviceOrderId, technicianId);
      setActiveCheckin(checkinData);

      toast({
        title: "Check-in realizado!",
        description: `Check-in feito às ${new Date(checkinData.checkin_timestamp).toLocaleTimeString('pt-BR')}`,
      });

      return checkinData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer check-in';
      toast({
        title: "Erro no Check-in",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Fazer check-out
   */
  const checkout = useCallback(async (checkinId: string): Promise<CheckinData | null> => {
    try {
      setIsLoading(true);

      const checkoutData = await CheckinService.checkout(checkinId);
      setActiveCheckin(checkoutData);

      const duration = checkoutData.total_duration_minutes || 0;
      const formattedDuration = formatDuration(duration);

      toast({
        title: "Check-out realizado!",
        description: `Tempo total de atendimento: ${formattedDuration}`,
      });

      return checkoutData;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer check-out';
      toast({
        title: "Erro no Check-out",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Validar proximidade com o endereço da ordem
   */
  const validateProximity = useCallback(async (
    serviceOrderId: string, 
    maxDistance: number = 500
  ): Promise<boolean> => {
    try {
      const currentLocation = await getCurrentLocation();
      if (!currentLocation) {
        return false;
      }

      const validation = await CheckinService.validateProximity(
        serviceOrderId,
        currentLocation.latitude,
        currentLocation.longitude,
        maxDistance
      );

      if (!validation.isValid) {
        toast({
          title: "Localização distante",
          description: `Você está a ${validation.distance}m do endereço da ordem. Máximo permitido: ${maxDistance}m`,
          variant: "destructive"
        });
      }

      return validation.isValid;
    } catch (error) {
      console.warn('Erro na validação de proximidade:', error);
      // Em caso de erro, permitir check-in (fail-safe)
      return true;
    }
  }, [getCurrentLocation, toast]);

  /**
   * Obter check-in ativo
   */
  const getActiveCheckin = useCallback(async (
    serviceOrderId: string, 
    technicianId: string
  ): Promise<CheckinData | null> => {
    try {
      const checkinData = await CheckinService.getActiveCheckin(serviceOrderId, technicianId);
      setActiveCheckin(checkinData);
      return checkinData;
    } catch (error) {
      console.error('Erro ao buscar check-in ativo:', error);
      return null;
    }
  }, []);

  /**
   * Formatar duração em minutos para string legível
   */
  const formatDuration = useCallback((minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}min`;
  }, []);

  /**
   * Formatar distância em metros para string legível
   */
  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    
    const kilometers = meters / 1000;
    return `${kilometers.toFixed(1)}km`;
  }, []);

  return {
    // Estados
    isLoading,
    activeCheckin,
    location,
    
    // Ações
    checkin,
    checkout,
    getCurrentLocation,
    validateProximity,
    getActiveCheckin,
    
    // Utilitários
    formatDuration,
    formatDistance
  };
}
