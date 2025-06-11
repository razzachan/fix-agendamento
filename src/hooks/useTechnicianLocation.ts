
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { technicianService } from '@/services';
import { toast } from '@/components/ui/use-toast';

interface Location {
  lat: number;
  lng: number;
}

export const useTechnicianLocation = (technicianId?: string) => {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [internalTechnicianId, setInternalTechnicianId] = useState<string | null>(technicianId || null);

  // Buscar o ID do técnico se não for fornecido
  useEffect(() => {
    const loadTechnicianId = async () => {
      if (!technicianId && user?.id) {
        try {
          const technician = await technicianService.getByUserId(user.id);
          if (technician) {
            setInternalTechnicianId(technician.id);

            // Se o técnico já tiver uma localização salva, vamos usar
            if (technician.location) {
              setCurrentLocation(technician.location);
            }
          }
        } catch (error) {
          console.error("Erro ao buscar dados do técnico:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadTechnicianId();
    // eslint-disable-next-line
  }, [technicianId, user]);

  // Função para atualizar a localização no banco (só aceita 1 argumento)
  const updateTechnicianLocation = async (location: Location) => {
    if (!internalTechnicianId) return;
    try {
      // Atualizamos diretamente a localização sem tentar modificar outros campos
      const { error } = await technicianService.updateLocation(internalTechnicianId, location);
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Erro ao atualizar localização:", error);
      toast({
        variant: "destructive",
        title: "Falha ao atualizar localização",
        description: "Não foi possível salvar sua localização atual."
      });
    }
  };

  // Iniciar o rastreamento automaticamente
  useEffect(() => {
    if (!internalTechnicianId) return;

    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta rastreamento de localização"
      });
      return;
    }

    setIsTracking(true);

    // Obter localização atual imediatamente
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(newLocation);
        await updateTechnicianLocation(newLocation);
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        toast({
          variant: "destructive",
          title: "Acesso à localização negado",
          description: "Não foi possível acessar sua localização"
        });
        setIsTracking(false);
      },
      { enableHighAccuracy: true }
    );

    // Configurar rastreamento contínuo
    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(newLocation);
        await updateTechnicianLocation(newLocation);
      },
      (error) => {
        console.error("Erro no rastreamento contínuo:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
    watchId.current = id;

    // Cleanup
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
    // eslint-disable-next-line
  }, [internalTechnicianId]);

  // Não será possível parar rastreamento manualmente nesse modelo
  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setIsTracking(false);
      return true;
    }
    return false;
  };

  return {
    location: currentLocation,
    isTracking,
    isLoading,
    technicianId: internalTechnicianId,
    stopTracking,
  };
};
