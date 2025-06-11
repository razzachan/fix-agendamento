import { useState, useEffect, useCallback } from 'react';
import { workshopQueueService, QueueItem, QueueMetrics } from '@/services/workshop/workshopQueueService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseWorkshopQueueReturn {
  queueItems: QueueItem[];
  queueMetrics: QueueMetrics;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshQueue: () => Promise<void>;
  reorderItem: (itemId: string, newPosition: number) => Promise<boolean>;
  getItemsByCategory: (category: QueueItem['category']) => QueueItem[];
  getUrgentItems: () => QueueItem[];
  getOverdueItems: () => QueueItem[];
}

/**
 * Hook para gerenciar a fila de trabalho da oficina
 */
export function useWorkshopQueue(): UseWorkshopQueueReturn {
  const { user } = useAuth();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics>({
    totalItems: 0,
    urgentItems: 0,
    averageWaitTime: 0,
    overdueItems: 0,
    estimatedCompletionTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Carrega a fila de trabalho
   */
  const refreshQueue = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ [useWorkshopQueue] Usuário não encontrado');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 [useWorkshopQueue] Carregando fila de trabalho...');
      setError(null);

      const items = await workshopQueueService.getWorkshopQueue(user.id);
      const metrics = workshopQueueService.calculateQueueMetrics(items);

      setQueueItems(items || []);
      setQueueMetrics(metrics || {
        totalItems: 0,
        urgentItems: 0,
        averageWaitTime: 0,
        overdueItems: 0,
        estimatedCompletionTime: 0
      });
      setLastUpdated(new Date());

      console.log('✅ [useWorkshopQueue] Fila carregada:', {
        totalItems: items?.length || 0,
        urgentItems: metrics?.urgentItems || 0,
        overdueItems: metrics?.overdueItems || 0
      });

    } catch (err) {
      console.error('❌ [useWorkshopQueue] Erro ao carregar fila:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar fila de trabalho';
      setError(errorMessage);
      toast.error(errorMessage);

      // Definir valores padrão em caso de erro
      setQueueItems([]);
      setQueueMetrics({
        totalItems: 0,
        urgentItems: 0,
        averageWaitTime: 0,
        overdueItems: 0,
        estimatedCompletionTime: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  /**
   * Reordena um item na fila
   */
  const reorderItem = useCallback(async (itemId: string, newPosition: number): Promise<boolean> => {
    try {
      console.log(`🔄 [useWorkshopQueue] Reordenando item ${itemId} para posição ${newPosition}`);
      
      // Encontrar o item
      const item = queueItems.find(i => i.id === itemId);
      if (!item) {
        toast.error('Item não encontrado na fila');
        return false;
      }

      // Verificar se pode ser reordenado
      if (!item.canReorder) {
        toast.error('Este item não pode ser reordenado');
        return false;
      }

      // Reordenar localmente primeiro (otimistic update)
      const newItems = [...queueItems];
      const currentIndex = newItems.findIndex(i => i.id === itemId);
      const targetIndex = newPosition - 1; // newPosition é 1-based

      if (currentIndex !== -1 && targetIndex >= 0 && targetIndex < newItems.length) {
        // Remover item da posição atual
        const [movedItem] = newItems.splice(currentIndex, 1);
        // Inserir na nova posição
        newItems.splice(targetIndex, 0, movedItem);
        
        // Atualizar posições
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          queuePosition: index + 1
        }));
        
        setQueueItems(updatedItems);
        
        // Tentar persistir no backend
        const success = await workshopQueueService.reorderQueueItem(itemId, newPosition);
        
        if (success) {
          toast.success('Item reordenado com sucesso');
          return true;
        } else {
          // Reverter se falhou
          await refreshQueue();
          toast.error('Erro ao reordenar item');
          return false;
        }
      }
      
      return false;
    } catch (err) {
      console.error('❌ [useWorkshopQueue] Erro ao reordenar item:', err);
      toast.error('Erro ao reordenar item');
      await refreshQueue(); // Reverter mudanças
      return false;
    }
  }, [queueItems, refreshQueue]);

  /**
   * Filtra itens por categoria
   */
  const getItemsByCategory = useCallback((category: QueueItem['category']): QueueItem[] => {
    return queueItems.filter(item => item.category === category);
  }, [queueItems]);

  /**
   * Obtém itens urgentes
   */
  const getUrgentItems = useCallback((): QueueItem[] => {
    return queueItems.filter(item => item.urgente);
  }, [queueItems]);

  /**
   * Obtém itens atrasados
   */
  const getOverdueItems = useCallback((): QueueItem[] => {
    return queueItems.filter(item => item.slaStatus === 'overdue');
  }, [queueItems]);

  // Carregamento inicial
  useEffect(() => {
    refreshQueue();
  }, [refreshQueue]);

  // Atualização automática a cada 3 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshQueue();
    }, 3 * 60 * 1000); // 3 minutos

    return () => clearInterval(interval);
  }, [refreshQueue]);

  return {
    queueItems,
    queueMetrics,
    isLoading,
    error,
    lastUpdated,
    refreshQueue,
    reorderItem,
    getItemsByCategory,
    getUrgentItems,
    getOverdueItems
  };
}
