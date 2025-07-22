
import { useState } from 'react';
import { ServiceOrder } from '@/types';
import { scheduledServiceService } from '@/services';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fetchServiceOrders } from './utils/serviceQueries';

export const useServiceOrdersSync = (selectedTechnicianId: string) => {
  const [foundOrders, setFoundOrders] = useState<ServiceOrder[]>([]);
  const [isSynchronizing, setIsSynchronizing] = useState(false);

  const findUnsyncedOrders = async (existingServices: any[]) => {
    if (!selectedTechnicianId || selectedTechnicianId === 'all') {
      console.log('No technician selected, skipping order fetch');
      return [];
    }
    
    try {
      console.log(`Fetching service orders for technician: ${selectedTechnicianId}`);
      const ordersData = await fetchServiceOrders(selectedTechnicianId);
      
      if (!ordersData || ordersData.length === 0) {
        console.log('No orders found for the selected technician');
        setFoundOrders([]);
        return [];
      }
      
      console.log(`Found ${ordersData.length} orders for technician ${selectedTechnicianId}`);
      
      // Filter orders that don't have corresponding services
      const ordersWithoutScheduling = ordersData.filter(order => {
        const hasScheduledService = existingServices.some(
          service => service.serviceOrderId === order.id
        );
        
        const hasScheduledDate = !!order.scheduledDate;
        if (!hasScheduledDate) {
          console.log(`Order ${order.id} skipped: no scheduled date`);
        }
        
        return !hasScheduledService && hasScheduledDate;
      });
      
      console.log(`Found ${ordersWithoutScheduling.length} orders without corresponding scheduling`);
      if (ordersWithoutScheduling.length > 0) {
        console.log('Orders that need synchronization:', ordersWithoutScheduling);
      }
      
      setFoundOrders(ordersWithoutScheduling);
      return ordersWithoutScheduling;
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao verificar ordens de serviço.');
      setFoundOrders([]);
      return [];
    }
  };

  const syncServiceOrders = async () => {
    if (!selectedTechnicianId || selectedTechnicianId === 'all') {
      toast.error('Selecione um técnico para sincronizar.');
      return;
    }
    
    setIsSynchronizing(true);
    
    try {
      let createdCount = 0;
      let errorCount = 0;
      
      console.log(`Starting synchronization for ${foundOrders.length} orders...`);
      
      for (const order of foundOrders) {
        if (order.scheduledDate) {
          try {
            const scheduledDate = new Date(order.scheduledDate);
            console.log(`Scheduling date: ${format(scheduledDate, 'yyyy-MM-dd')} for order ${order.id}`);
            
            const result = await scheduledServiceService.createFromServiceOrder(
              order.id,
              order.clientName,
              order.description,
              order.pickupAddress || '',
              selectedTechnicianId,
              order.technicianName || 'Technician',
              scheduledDate,
              order.clientId  // 🔧 CORREÇÃO: Adicionar clientId que estava faltando
            );
            
            if (result) {
              console.log(`Scheduled service created successfully for order ${order.id}`);
              createdCount++;
            } else {
              console.error(`Failed to create scheduled service for order ${order.id}`);
              errorCount++;
            }
          } catch (error) {
            console.error(`Error synchronizing order ${order.id}:`, error);
            errorCount++;
          }
        }
      }
      
      if (createdCount > 0) {
        toast.success(`${createdCount} serviços sincronizados com o calendário.`);
        setTimeout(() => window.location.reload(), 1500); // Give the toast time to be seen
      } else if (errorCount > 0) {
        toast.error(`${errorCount} erros ocorreram durante a sincronização.`);
      } else if (foundOrders.length === 0) {
        toast.info("Não há novas ordens de serviço para sincronizar.");
      } else {
        toast.info("Nenhum serviço foi sincronizado. Verifique as ordens.");
      }
    } catch (error) {
      console.error("Error synchronizing orders:", error);
      toast.error("Erro ao sincronizar ordens de serviço.");
    } finally {
      setIsSynchronizing(false);
    }
  };

  return {
    foundOrders,
    findUnsyncedOrders,
    syncServiceOrders,
    isSynchronizing
  };
};
