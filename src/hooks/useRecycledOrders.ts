import { useState, useEffect } from 'react';
import { ServiceOrder } from '@/types';
import { recycleOrderService } from '@/services/recycleOrderService';

/**
 * Hook para gerenciar ordens recicladas
 * Filtra ordens canceladas que já foram recicladas
 */
export const useRecycledOrders = (technicianId: string | null) => {
  const [recycledOrderIds, setRecycledOrderIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Carregar IDs das ordens recicladas
  useEffect(() => {
    const loadRecycledOrders = async () => {
      if (!technicianId) return;

      setIsLoading(true);
      try {
        // Buscar todas as ordens canceladas do técnico
        const cancelledOrders = await recycleOrderService.getRecyclableOrders(100);
        const technicianCancelledOrders = cancelledOrders.filter(
          order => order.technician_id === technicianId
        );

        // Verificar quais foram recicladas
        const recycledIds = new Set<string>();
        for (const order of technicianCancelledOrders) {
          const isRecycled = await recycleOrderService.isOrderRecycled(order.id);
          if (isRecycled) {
            recycledIds.add(order.id);
          }
        }

        setRecycledOrderIds(recycledIds);
      } catch (error) {
        console.error('Erro ao carregar ordens recicladas:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecycledOrders();
  }, [technicianId]);

  /**
   * Filtra ordens canceladas removendo as que foram recicladas
   */
  const filterNonRecycledOrders = (orders: ServiceOrder[]): ServiceOrder[] => {
    return orders.filter(order => {
      if (order.status !== 'cancelled') return true;
      return !recycledOrderIds.has(order.id);
    });
  };

  /**
   * Verifica se uma ordem foi reciclada
   */
  const isOrderRecycled = (orderId: string): boolean => {
    return recycledOrderIds.has(orderId);
  };

  /**
   * Marca uma ordem como reciclada (para atualização em tempo real)
   */
  const markOrderAsRecycled = (orderId: string) => {
    setRecycledOrderIds(prev => new Set([...prev, orderId]));
  };

  return {
    recycledOrderIds,
    isLoading,
    filterNonRecycledOrders,
    isOrderRecycled,
    markOrderAsRecycled
  };
};
