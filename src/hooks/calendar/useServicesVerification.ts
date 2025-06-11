
import { useState, useCallback } from 'react';
import { useScheduledServicesVerification } from './useScheduledServicesVerification';
import { useServiceOrdersSync } from './useServiceOrdersSync';
import { toast } from 'sonner';

export const useServicesVerification = (selectedTechnicianId: string) => {
  const [isCheckingData, setIsCheckingData] = useState(false);
  
  const { 
    foundServices, 
    hasAnyServices, 
    findExistingServices,
    isVerifying
  } = useScheduledServicesVerification(selectedTechnicianId);
  
  const {
    foundOrders,
    findUnsyncedOrders,
    syncServiceOrders,
    isSynchronizing
  } = useServiceOrdersSync(selectedTechnicianId);

  const checkForAnyServices = useCallback(async () => {
    if (!selectedTechnicianId || selectedTechnicianId === 'all') {
      toast.error('Selecione um técnico para verificar.');
      return false;
    }
    
    setIsCheckingData(true);
    try {
      console.log(`Verificando serviços para técnico: ${selectedTechnicianId}`);
      const existingServices = await findExistingServices();
      
      console.log(`Verificando ordens não sincronizadas para técnico: ${selectedTechnicianId}`);
      const unsyncedOrders = await findUnsyncedOrders(existingServices);
      
      console.log(`Verificação concluída: ${existingServices.length} serviços encontrados, ${unsyncedOrders.length} ordens não sincronizadas`);
      
      return existingServices.length > 0;
    } catch (error) {
      console.error("Erro ao verificar serviços:", error);
      toast.error("Falha ao verificar serviços disponíveis.");
      return false;
    } finally {
      setIsCheckingData(false);
    }
  }, [selectedTechnicianId, findExistingServices, findUnsyncedOrders]);

  return {
    isCheckingData: isCheckingData || isVerifying || isSynchronizing,
    hasAnyServices,
    foundServices,
    foundOrders,
    checkForAnyServices,
    syncServiceOrders
  };
};
