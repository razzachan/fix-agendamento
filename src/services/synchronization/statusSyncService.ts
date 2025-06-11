/**
 * Serviço de sincronização bidirecional entre ServiceOrder e ScheduledService
 */

import { scheduledServiceService } from '@/services/scheduledService';
import { mapServiceOrderToScheduledStatus } from '@/utils/statusMappingUtils';
import { ServiceOrder, ScheduledService } from '@/types';

export const statusSyncService = {
  /**
   * Sincroniza status de ServiceOrder para ScheduledService
   */
  async syncServiceOrderToScheduled(
    serviceOrderId: string, 
    newServiceOrderStatus: string,
    scheduledServices: ScheduledService[]
  ): Promise<boolean> {
    try {
      // Encontrar o ScheduledService correspondente
      const relatedScheduledService = scheduledServices.find(
        service => service.serviceOrderId === serviceOrderId
      );

      if (!relatedScheduledService) {
        console.log(`Nenhum ScheduledService encontrado para ServiceOrder ${serviceOrderId}`);
        return true; // Não é erro, apenas não há agendamento
      }

      // Mapear status
      const newScheduledStatus = mapServiceOrderToScheduledStatus(newServiceOrderStatus);
      
      // Verificar se precisa atualizar
      if (relatedScheduledService.status === newScheduledStatus) {
        console.log(`Status já sincronizado para ScheduledService ${relatedScheduledService.id}`);
        return true;
      }

      console.log(`Sincronizando status: ServiceOrder ${serviceOrderId} (${newServiceOrderStatus}) → ScheduledService ${relatedScheduledService.id} (${newScheduledStatus})`);

      // Atualizar ScheduledService
      const success = await scheduledServiceService.updateServiceStatus(
        relatedScheduledService.id,
        newScheduledStatus
      );

      if (success) {
        console.log(`✅ Status sincronizado com sucesso`);
      } else {
        console.error(`❌ Falha ao sincronizar status`);
      }

      return success;
    } catch (error) {
      console.error('Erro ao sincronizar status ServiceOrder → ScheduledService:', error);
      return false;
    }
  },

  /**
   * Sincroniza status de ScheduledService para ServiceOrder
   * (Uso mais limitado - principalmente para cancelamentos)
   */
  async syncScheduledToServiceOrder(
    scheduledServiceId: string,
    newScheduledStatus: string,
    serviceOrders: ServiceOrder[],
    updateServiceOrderFn: (orderId: string, updates: Partial<ServiceOrder>) => Promise<boolean>
  ): Promise<boolean> {
    try {
      // Encontrar o ServiceOrder correspondente
      const relatedServiceOrder = serviceOrders.find(
        order => {
          // Buscar por ScheduledService que tem este serviceOrderId
          return order.id === scheduledServiceId; // Simplificado - pode precisar de lógica mais complexa
        }
      );

      if (!relatedServiceOrder) {
        console.log(`Nenhum ServiceOrder encontrado para ScheduledService ${scheduledServiceId}`);
        return true;
      }

      // Apenas sincronizar cancelamentos e conclusões
      if (newScheduledStatus === 'cancelled' && relatedServiceOrder.status !== 'cancelled') {
        console.log(`Sincronizando cancelamento: ScheduledService ${scheduledServiceId} → ServiceOrder ${relatedServiceOrder.id}`);
        
        const success = await updateServiceOrderFn(relatedServiceOrder.id, {
          status: 'cancelled' as any
        });

        return success;
      }

      if (newScheduledStatus === 'completed' && relatedServiceOrder.status !== 'completed') {
        console.log(`Sincronizando conclusão: ScheduledService ${scheduledServiceId} → ServiceOrder ${relatedServiceOrder.id}`);
        
        const success = await updateServiceOrderFn(relatedServiceOrder.id, {
          status: 'completed' as any
        });

        return success;
      }

      return true; // Outros status não precisam ser sincronizados nesta direção
    } catch (error) {
      console.error('Erro ao sincronizar status ScheduledService → ServiceOrder:', error);
      return false;
    }
  },

  /**
   * Verifica e corrige inconsistências de status
   */
  async validateAndFixStatusConsistency(
    serviceOrders: ServiceOrder[],
    scheduledServices: ScheduledService[]
  ): Promise<{ fixed: number; errors: number }> {
    let fixed = 0;
    let errors = 0;

    try {
      for (const serviceOrder of serviceOrders) {
        const relatedScheduledService = scheduledServices.find(
          service => service.serviceOrderId === serviceOrder.id
        );

        if (relatedScheduledService) {
          const expectedScheduledStatus = mapServiceOrderToScheduledStatus(serviceOrder.status);
          
          if (relatedScheduledService.status !== expectedScheduledStatus) {
            console.log(`Inconsistência detectada: ServiceOrder ${serviceOrder.id} (${serviceOrder.status}) vs ScheduledService ${relatedScheduledService.id} (${relatedScheduledService.status})`);
            
            const success = await scheduledServiceService.updateServiceStatus(
              relatedScheduledService.id,
              expectedScheduledStatus
            );

            if (success) {
              fixed++;
              console.log(`✅ Inconsistência corrigida`);
            } else {
              errors++;
              console.error(`❌ Falha ao corrigir inconsistência`);
            }
          }
        }
      }

      console.log(`Validação concluída: ${fixed} correções, ${errors} erros`);
      return { fixed, errors };
    } catch (error) {
      console.error('Erro durante validação de consistência:', error);
      return { fixed, errors: errors + 1 };
    }
  }
};
