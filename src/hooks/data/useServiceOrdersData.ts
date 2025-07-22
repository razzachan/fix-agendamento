
import { useState, useEffect, useCallback } from 'react';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { scheduledServiceService, serviceOrderService } from '@/services';
import { useEventBus } from '@/hooks/useEventBus';
import { translateStatus } from '@/utils/translations';
import { triggerNotificationUpdate } from '@/utils/notificationEvents';

export function useServiceOrdersData() {
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para armazenar o mapeamento de agendamentos para ordens de serviço
  const [appointmentToOrderMap, setAppointmentToOrderMap] = useState<Record<string, string>>({});

  // Acesso ao barramento de eventos
  const { publish, subscribe } = useEventBus();

  // Função para verificar se um agendamento tem ordem de serviço
  const hasServiceOrder = useCallback((agendamentoId: string | number): boolean => {
    if (!agendamentoId) return false;

    const id = agendamentoId.toString();
    const hasOrder = !!appointmentToOrderMap[id];

    if (hasOrder) {
      console.log(`Agendamento ${id} tem ordem de serviço: ${appointmentToOrderMap[id]}`);
    }

    return hasOrder;
  }, [appointmentToOrderMap]);

  // Função para obter o ID da ordem de serviço de um agendamento
  const getServiceOrderId = useCallback((agendamentoId: string | number): string | null => {
    if (!agendamentoId) return null;

    const id = agendamentoId.toString();
    return appointmentToOrderMap[id] || null;
  }, [appointmentToOrderMap]);

  useEffect(() => {
    fetchServiceOrders();

    // Inscrever-se para eventos de atualização de ordens de serviço
    const unsubscribe = subscribe('serviceOrder:updated', () => {
      console.log('[useServiceOrdersData] Evento de atualização de ordem de serviço recebido');
      fetchServiceOrders();
    });

    return () => {
      unsubscribe();
    };
  }, []); // Removido subscribe das dependências para evitar loops

  const fetchServiceOrders = async () => {
    try {
      setIsLoading(true);
      const orders = await serviceOrderService.getAll();
      console.log('Fetched service orders:', orders);
      setServiceOrders(orders);

      // Criar mapeamento de agendamentos para ordens de serviço
      const mapping: Record<string, string> = {};
      orders.forEach(order => {
        if (order.agendamentoId) {
          mapping[order.agendamentoId] = order.id;
          console.log(`[useServiceOrdersData] Mapeamento: Agendamento ${order.agendamentoId} -> OS ${order.id}`);
        }
      });

      setAppointmentToOrderMap(mapping);
      console.log('[useServiceOrdersData] Mapeamento de agendamentos para ordens de serviço atualizado:', mapping);
    } catch (error) {
      console.error('Erro ao carregar ordens de serviço:', error);
      toast.error('Erro ao carregar ordens de serviço.');
    } finally {
      setIsLoading(false);
    }
  };

  const addServiceOrder = async (newOrder: Partial<ServiceOrder>): Promise<ServiceOrder | null> => {
    try {
      const now = new Date().toISOString();

      // Better logging for service attendance type
      console.log(`addServiceOrder: Received order with attendance type: "${newOrder.serviceAttendanceType}"`);

      // Validate service attendance type
      const validAttendanceType = newOrder.serviceAttendanceType &&
        ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(newOrder.serviceAttendanceType)
          ? newOrder.serviceAttendanceType
          : "em_domicilio";

      console.log(`addServiceOrder: Using attendance type: "${validAttendanceType}"`);

      const serviceOrder: ServiceOrder = {
        id: '', // Será preenchido pelo banco de dados
        clientId: newOrder.clientId || '',
        clientName: newOrder.clientName || 'Cliente não especificado',
        clientEmail: newOrder.clientEmail || null,
        clientPhone: newOrder.clientPhone || null,
        clientCpfCnpj: newOrder.clientCpfCnpj || null,
        clientAddressComplement: newOrder.clientAddressComplement || null,
        clientAddressReference: newOrder.clientAddressReference || null,
        technicianId: newOrder.technicianId || null,
        technicianName: newOrder.technicianName || null,
        status: (newOrder.status as ServiceOrderStatus) || 'pending',
        createdAt: now,
        scheduledDate: newOrder.scheduledDate || null,
        scheduledTime: newOrder.scheduledTime || null,
        completedDate: newOrder.completedDate || null,
        description: newOrder.description || 'Sem descrição',
        equipmentType: newOrder.equipmentType || 'Não especificado',
        equipmentModel: newOrder.equipmentModel || null,
        equipmentSerial: newOrder.equipmentSerial || null,
        needsPickup: newOrder.needsPickup || false,
        pickupAddress: newOrder.pickupAddress || null,
        pickupCity: newOrder.pickupCity || null,
        pickupState: newOrder.pickupState || null,
        pickupZipCode: newOrder.pickupZipCode || null,
        currentLocation: newOrder.currentLocation || 'workshop',
        serviceAttendanceType: validAttendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico",
        clientDescription: newOrder.description || 'Sem descrição',  // Add missing property
        clientFullAddress: newOrder.clientFullAddress || null,
        archived: false,
        images: [],
        serviceItems: newOrder.serviceItems || [{  // Add missing property
          id: uuidv4(),
          serviceOrderId: '', // Será preenchido após criação da OS
          serviceType: '',
          serviceAttendanceType: validAttendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico",
          equipmentType: newOrder.equipmentType || 'Não especificado',
          equipmentModel: newOrder.equipmentModel || null,
          equipmentSerial: newOrder.equipmentSerial || null,
          clientDescription: newOrder.description || 'Sem descrição',
          serviceValue: ''
        }]
      };

      // Log service order data before sending to API
      console.log(`addServiceOrder: Sending service order with attendance type="${serviceOrder.serviceAttendanceType}", equipment="${serviceOrder.equipmentType}"`);

      // Create the service order
      const orderId = await serviceOrderService.create(serviceOrder);

      if (!orderId) {
        console.error("Falha ao criar ordem de serviço: nenhum ID retornado");
        return null;
      }

      // Atualizar o serviceOrder com o ID real retornado pelo banco
      serviceOrder.id = orderId;

      // Atualizar também os serviceItems com o ID correto da OS
      serviceOrder.serviceItems = serviceOrder.serviceItems.map(item => ({
        ...item,
        serviceOrderId: orderId
      }));

      // Create scheduling if there's a scheduled date and technician
      if (serviceOrder.scheduledDate && serviceOrder.technicianId && serviceOrder.technicianName) {
        console.log('🔍 [useServiceOrdersData] Tentando criar agendamento para ordem de serviço:', {
          orderId: serviceOrder.id,
          technicianId: serviceOrder.technicianId,
          scheduledDate: serviceOrder.scheduledDate,
          scheduledDateType: typeof serviceOrder.scheduledDate,
          scheduledDateParsed: new Date(serviceOrder.scheduledDate).toISOString()
        });

        const result = await scheduledServiceService.createFromServiceOrder(
          serviceOrder.id,
          serviceOrder.clientName,
          serviceOrder.description,
          serviceOrder.pickupAddress || '',
          serviceOrder.technicianId,
          serviceOrder.technicianName,
          new Date(serviceOrder.scheduledDate),
          serviceOrder.clientId  // 🔧 CORREÇÃO: Adicionar clientId que estava faltando
        );

        console.log('🔍 [useServiceOrdersData] Resultado da criação do agendamento:', result);

        if (serviceOrder.status === 'pending') {
          await updateServiceOrder(serviceOrder.id, { status: 'scheduled' });
          serviceOrder.status = 'scheduled';
        }
      }

      setServiceOrders(prev => [serviceOrder, ...prev]);

      // Atualizar o mapeamento se houver um agendamento associado
      if (newOrder.agendamentoId) {
        setAppointmentToOrderMap(prev => ({
          ...prev,
          [newOrder.agendamentoId]: serviceOrder.id
        }));

        console.log(`[useServiceOrdersData] Nova OS ${serviceOrder.id} criada para o agendamento ${newOrder.agendamentoId}`);

        // Publicar evento de criação de ordem de serviço
        publish('serviceOrder:created', {
          serviceOrderId: serviceOrder.id,
          agendamentoId: newOrder.agendamentoId
        });
      }

      toast.success('Ordem de serviço criada com sucesso!');

      return serviceOrder;
    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      toast.error('Erro ao criar ordem de serviço. Verifique os dados informados.');
      return null;
    }
  };

  const updateServiceOrder = async (id: string, updates: Partial<ServiceOrder>) => {
    try {
      console.log(`useServiceOrdersData: Attempting to update order ${id} with:`, updates);

      // Log de detalhes importantes antes da atualização
      if (updates.status) {
        console.log(`useServiceOrdersData: Status update to "${updates.status}" requested`);

        // Encontrar o pedido atual para comparação
        const currentOrder = serviceOrders.find(o => o.id === id);
        if (currentOrder) {
          console.log(`useServiceOrdersData: Current order status is "${currentOrder.status}"`);
          console.log(`useServiceOrdersData: Order service type is "${currentOrder.serviceAttendanceType || 'not specified'}"`);
        }
      }

      // Verificar se há atualizações relacionadas à garantia
      if (updates.warrantyPeriod !== undefined ||
          updates.warrantyStartDate !== undefined ||
          updates.warrantyEndDate !== undefined ||
          updates.warrantyTerms !== undefined) {
        console.log(`useServiceOrdersData: Warranty update detected for order ${id}`, {
          warrantyPeriod: updates.warrantyPeriod,
          warrantyStartDate: updates.warrantyStartDate,
          warrantyEndDate: updates.warrantyEndDate,
          warrantyTerms: updates.warrantyTerms
        });
      }

      const success = await serviceOrderService.update(id, updates);

      if (success) {
        console.log(`useServiceOrdersData: Update succeeded for order ${id}`);

        // Update the local state immediately for better UX
        setServiceOrders(prev =>
          prev.map(order => order.id === id ? { ...order, ...updates } : order)
        );

        // CRIAR NOTIFICAÇÃO AUTOMÁTICA PARA MUDANÇAS DE STATUS
        // Exceto para "completed" pois já temos a notificação "OS finalizada"
        if (updates.status && updates.status !== 'completed') {
          try {
            const currentOrder = serviceOrders.find(o => o.id === id);
            if (currentOrder) {
              console.log(`🔔 [useServiceOrdersData] Criando notificações para mudança de status: ${currentOrder.status} → ${updates.status}`);

              const { supabase } = await import('@/integrations/supabase/client');

              // 1. NOTIFICAÇÃO PARA O ADMIN
              const { data: adminUser, error: adminError } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'admin')
                .limit(1)
                .single();

              if (adminError || !adminUser) {
                console.error('❌ Erro ao buscar admin para notificação:', adminError);
              } else {
                const adminNotificationData = {
                  user_id: adminUser.id,
                  title: `✅ Status Atualizado com Sucesso!`,
                  description: `A ordem de serviço #${id.substring(0, 8)} (${currentOrder.clientName}) teve seu status alterado de "${translateStatus(currentOrder.status)}" para "${translateStatus(updates.status)}" via sistema. Equipamento: ${currentOrder.equipmentType}. Atualizado em: ${new Date().toLocaleString('pt-BR')}`,
                  type: 'success',
                  read: false,
                  time: new Date().toISOString()
                };

                const { data: adminData, error: adminDbError } = await supabase
                  .from('notifications')
                  .insert(adminNotificationData)
                  .select();

                if (!adminDbError) {
                  console.log(`✅ [useServiceOrdersData] Notificação admin criada com sucesso!`, adminData);
                } else {
                  console.error(`❌ [useServiceOrdersData] Erro ao criar notificação admin:`, adminDbError);
                }
              }

              // 2. NOTIFICAÇÃO PARA O CLIENTE
              if (currentOrder.clientId) {
                const statusMessages: Record<string, { title: string; description: string }> = {
                  'scheduled': {
                    title: '📅 Serviço Agendado',
                    description: `Seu serviço de ${currentOrder.equipmentType} foi agendado. Em breve entraremos em contato para confirmar os detalhes.`
                  },
                  'collected': {
                    title: '📦 Equipamento Coletado',
                    description: `Seu ${currentOrder.equipmentType} foi coletado e está sendo encaminhado para análise.`
                  },
                  'at_workshop': {
                    title: '🔧 Equipamento na Oficina',
                    description: `Seu ${currentOrder.equipmentType} chegou na oficina e está sendo analisado por nossos técnicos.`
                  },
                  'diagnosis_completed': {
                    title: '🔍 Diagnóstico Concluído',
                    description: `O diagnóstico do seu ${currentOrder.equipmentType} foi concluído. Em breve você receberá o orçamento.`
                  },
                  'quote_approved': {
                    title: '✅ Orçamento Aprovado',
                    description: `O orçamento para reparo do seu ${currentOrder.equipmentType} foi aprovado. O reparo será iniciado em breve.`
                  },
                  'in_progress': {
                    title: '⚙️ Reparo em Andamento',
                    description: `O reparo do seu ${currentOrder.equipmentType} está em andamento. Nossos técnicos estão trabalhando no seu equipamento.`
                  },
                  'ready_for_delivery': {
                    title: '✅ Pronto para Entrega',
                    description: `Seu ${currentOrder.equipmentType} está pronto! Entre em contato conosco para agendar a entrega.`
                  },
                  'delivered': {
                    title: '🚚 Equipamento Entregue',
                    description: `Seu ${currentOrder.equipmentType} foi entregue com sucesso. Obrigado por confiar em nossos serviços!`
                  }
                };

                const clientMessage = statusMessages[updates.status] || {
                  title: '📋 Status Atualizado',
                  description: `O status do seu ${currentOrder.equipmentType} foi atualizado.`
                };

                const clientNotificationData = {
                  user_id: currentOrder.clientId,
                  title: clientMessage.title,
                  description: clientMessage.description,
                  type: 'info',
                  read: false,
                  time: new Date().toISOString()
                };

                const { data: clientData, error: clientDbError } = await supabase
                  .from('notifications')
                  .insert(clientNotificationData)
                  .select();

                if (!clientDbError) {
                  console.log(`✅ [useServiceOrdersData] Notificação cliente criada com sucesso!`, clientData);

                  // Disparar evento para atualização imediata das notificações
                  triggerNotificationUpdate();
                } else {
                  console.error(`❌ [useServiceOrdersData] Erro ao criar notificação cliente:`, clientDbError);
                }
              } else {
                console.warn(`⚠️ [useServiceOrdersData] ClientId não encontrado para ordem ${id}`);
              }
            }
          } catch (notificationError) {
            console.error(`❌ [useServiceOrdersData] Erro geral ao criar notificação:`, notificationError);
          }
        }

        // Re-fetch data to ensure consistency with the database
        // Especialmente importante para atualizações de garantia onde datas são calculadas no backend
        await fetchServiceOrders();

        // Publicar evento de atualização de ordem de serviço
        publish('serviceOrder:updated', {
          serviceOrderId: id,
          updates
        });

        // Success notification já é mostrada em ServiceOrdersPage
        return true;
      } else {
        console.error(`useServiceOrdersData: Update failed for order ${id}`);
        // Error notification já é mostrada em ServiceOrdersPage
        return false;
      }
    } catch (error) {
      console.error(`Erro ao atualizar ordem de serviço ${id}:`, error);
      // Error notification já é mostrada em ServiceOrdersPage
      return false;
    }
  };

  const deleteServiceOrder = async (id: string) => {
    try {
      console.log(`Tentando arquivar ordem de serviço ${id}...`);
      const success = await serviceOrderService.delete(id);

      if (success) {
        console.log(`Ordem de serviço ${id} arquivada com sucesso`);
        // Remover a ordem arquivada da lista local
        setServiceOrders(prev => {
          const updatedOrders = prev.filter(order => order.id !== id);
          console.log(`Ordens antes: ${prev.length}, Ordens após: ${updatedOrders.length}`);
          return updatedOrders;
        });
        toast.success('Ordem de serviço arquivada com sucesso!');
        return true;
      } else {
        console.error(`Falha ao arquivar ordem de serviço ${id}`);
        return false;
      }
    } catch (error) {
      console.error(`Erro ao arquivar ordem de serviço ${id}:`, error);
      toast.error('Erro ao arquivar ordem de serviço.');
      return false;
    }
  };

  return {
    serviceOrders,
    appointmentToOrderMap,
    addServiceOrder,
    updateServiceOrder,
    deleteServiceOrder,
    isLoading,
    refreshServiceOrders: fetchServiceOrders,
    hasServiceOrder,
    getServiceOrderId,
  };
}
