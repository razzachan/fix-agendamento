import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';
import { notificationService } from '@/services/notificationService';
import { addProgressEntry } from './addProgressEntry';
import { notificationTriggers } from '@/services/notifications/notificationTriggers';
import { mapServiceOrder } from '../queries/mapServiceOrder';
import { locationUpdateService } from '../locationUpdateService';

// Import valid status values from types to ensure consistency
import { ServiceOrderStatus } from '@/types';

// Define valid status values that match exactly the ServiceOrderStatus type
const VALID_STATUS_VALUES: ServiceOrderStatus[] = [
  'pending',
  'scheduled',
  'scheduled_collection',
  'in_progress',
  'on_the_way',
  'collected',
  'collected_for_diagnosis',
  'at_workshop',
  'received_at_workshop',
  'diagnosis_completed',
  'quote_sent',
  'awaiting_quote_approval',
  'quote_approved',
  'quote_rejected',
  'ready_for_return',
  'needs_workshop',
  'ready_for_delivery',
  'collected_for_delivery',
  'on_the_way_to_deliver',
  'payment_pending',
  'completed',
  'cancelled'
];

/**
 * Updates an existing service order in the database
 */
export async function updateServiceOrder(id: string, updates: Partial<ServiceOrder>): Promise<boolean> {
  try {
    console.log('updateServiceOrder: Updating service order with data:', updates);
    const updateData: any = {};

    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.clientName !== undefined) updateData.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) updateData.client_email = updates.clientEmail;
    if (updates.clientPhone !== undefined) updateData.client_phone = updates.clientPhone;
    if (updates.technicianId !== undefined) updateData.technician_id = updates.technicianId;
    if (updates.technicianName !== undefined) updateData.technician_name = updates.technicianName;

    // Validate the status before updating
    if (updates.status !== undefined) {
      console.log(`updateServiceOrder: Status update detected - ${updates.status}`);

      // Check if the status is valid
      if (!VALID_STATUS_VALUES.includes(updates.status)) {
        console.error(`updateServiceOrder: Invalid status: ${updates.status}`);
        console.error(`updateServiceOrder: Valid statuses are: ${VALID_STATUS_VALUES.join(', ')}`);
        toast.error(`Status inválido: ${updates.status}`);
        return false;
      }

      updateData.status = updates.status;

      // Automatically set completed_date when status is changed to 'completed'
      if (updates.status === 'completed' && !updates.completedDate) {
        console.log(`updateServiceOrder: Setting completed_date for completed status`);
        updateData.completed_date = new Date().toISOString();
      }
    }

    if (updates.scheduledDate !== undefined) updateData.scheduled_date = updates.scheduledDate;
    if (updates.completedDate !== undefined) updateData.completed_date = updates.completedDate;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.equipmentType !== undefined) updateData.equipment_type = updates.equipmentType;
    if (updates.equipmentModel !== undefined) updateData.equipment_model = updates.equipmentModel;
    if (updates.equipmentSerial !== undefined) updateData.equipment_serial = updates.equipmentSerial;
    if (updates.needsPickup !== undefined) updateData.needs_pickup = updates.needsPickup;
    if (updates.pickupAddress !== undefined) updateData.pickup_address = updates.pickupAddress;
    if (updates.pickupCity !== undefined) updateData.pickup_city = updates.pickupCity;
    if (updates.pickupState !== undefined) updateData.pickup_state = updates.pickupState;
    if (updates.pickupZipCode !== undefined) updateData.pickup_zip_code = updates.pickupZipCode;
    if (updates.currentLocation !== undefined) updateData.current_location = updates.currentLocation;
    if (updates.serviceAttendanceType !== undefined) updateData.service_attendance_type = updates.serviceAttendanceType;

    // First, fetch current order data for comparison
    const { data: currentOrder, error: fetchError } = await supabase
      .from('service_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`updateServiceOrder: Error fetching OS ${id}:`, fetchError);
      return false;
    }

    console.log(`updateServiceOrder: Current order data:`, currentOrder);
    console.log(`updateServiceOrder: Applying updates:`, updateData);

    // Update the service order
    const { error } = await supabase
      .from('service_orders')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error(`updateServiceOrder: Supabase error updating OS ${id}:`, error);
      throw error;
    }

    console.log(`updateServiceOrder: Update successful for order ${id}`);

    // Create notifications and progress entries for status changes or technician assignments
    if (Object.keys(updateData).length > 0) {
      // Create notification and progress entry if status was changed
      if (updates.status && currentOrder.status !== updates.status) {
        console.log(`updateServiceOrder: Creating notification for status change ${currentOrder.status} -> ${updates.status}`);

        // 🎯 ATUALIZAR CURRENT_LOCATION AUTOMATICAMENTE
        await locationUpdateService.updateLocationOnStatusChange(
          id,
          currentOrder.status,
          updates.status,
          currentOrder.service_attendance_type as any
        );

        // Mapear dados da ordem para o formato ServiceOrder
        const serviceOrder = mapServiceOrder(currentOrder);

        // Disparar notificações robustas apenas para status específicos (evita duplicação geral)
        // As notificações de status são criadas pelo useServiceOrdersData.ts
        // Mas mantemos as notificações especiais do NotificationEngine para eventos importantes
        if (updates.status === 'completed') {
          await notificationTriggers.onStatusChanged(
            serviceOrder,
            currentOrder.status,
            updates.status,
            { updatedBy: updates.updatedByName || 'Sistema' }
          );
        }

        // Add progress entry to track status change
        await addProgressEntry({
          serviceOrderId: id,
          status: updates.status,
          notes: updates.notes || `Status alterado de ${currentOrder.status} para ${updates.status}`,
          userName: updates.updatedByName || 'Sistema',
          userId: updates.updatedById || null,
          systemGenerated: !updates.updatedById
        });
      }

      // Create notification if a technician was assigned
      if (updates.technicianId && currentOrder.technician_id !== updates.technicianId) {
        // Mapear dados da ordem para o formato ServiceOrder
        const serviceOrder = mapServiceOrder(currentOrder);

        // DESABILITADO: Disparar notificações robustas para atribuição de técnico (evita duplicação)
        // await notificationTriggers.onTechnicianAssigned(
        //   serviceOrder,
        //   updates.technicianName || 'Técnico'
        // );

        // Add progress entry to track technician assignment
        await addProgressEntry({
          serviceOrderId: id,
          status: currentOrder.status,
          notes: `Técnico ${updates.technicianName || 'desconhecido'} atribuído à ordem de serviço`,
          userName: updates.updatedByName || 'Sistema',
          userId: updates.updatedById || null,
          systemGenerated: !updates.updatedById
        });
      }
    }

    // Disparar evento para atualizar badges se o status mudou
    if (updates.status) {
      console.log('🔔 [updateServiceOrder] Disparando evento de atualização de badges');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('serviceOrderUpdated', {
          detail: {
            orderId: id,
            newStatus: updates.status,
            source: 'updateServiceOrder'
          }
        }));
        window.dispatchEvent(new CustomEvent('orderStatusChanged', {
          detail: {
            orderId: id,
            newStatus: updates.status,
            source: 'updateServiceOrder'
          }
        }));
      }, 100);
    }

    return true;
  } catch (error) {
    console.error(`updateServiceOrder: Error updating service order ${id}:`, error);
    toast.error('Erro ao atualizar ordem de serviço.');
    return false;
  }
}

async function createStatusChangeNotification(order: any, newStatus: string) {
  // Determinar o tipo de notificação com base no status
  const notificationType = getNotificationTypeForStatus(newStatus);

  // Mensagem baseada no novo status
  const statusMessages: Record<string, { title: string; description: string }> = {
    'pending': {
      title: 'Nova ordem de serviço criada',
      description: `Ordem de serviço para ${order.client_name} foi registrada e aguarda processamento.`
    },
    'scheduled': {
      title: 'Serviço agendado',
      description: `O serviço para ${order.equipment_type} foi agendado.`
    },
    'in_progress': {
      title: 'Serviço em andamento',
      description: `O técnico iniciou o trabalho no ${order.equipment_type}.`
    },
    'on_the_way': {
      title: 'Técnico a caminho',
      description: `O técnico está a caminho para atender o serviço do ${order.equipment_type}.`
    },
    'collected': {
      title: 'Equipamento coletado',
      description: `O ${order.equipment_type} foi coletado para manutenção.`
    },
    'at_workshop': {
      title: 'Equipamento na oficina',
      description: `O ${order.equipment_type} está na oficina para manutenção.`
    },
    'collected_for_delivery': {
      title: 'Equipamento coletado para entrega',
      description: `O ${order.equipment_type} foi coletado para entrega.`
    },
    'on_the_way_to_deliver': {
      title: 'Equipamento a caminho para entrega',
      description: `O técnico está a caminho para entregar o ${order.equipment_type}.`
    },
    'payment_pending': {
      title: 'Pagamento pendente',
      description: `O serviço para ${order.equipment_type} aguarda pagamento para finalização.`
    },
    'completed': {
      title: 'Serviço concluído',
      description: `O serviço para ${order.equipment_type} foi concluído com sucesso.`
    },
    'cancelled': {
      title: 'Serviço cancelado',
      description: `O serviço para ${order.equipment_type} foi cancelado.`
    }
  };

  const message = statusMessages[newStatus] || {
    title: 'Status atualizado',
    description: `O status do serviço para ${order.equipment_type} foi atualizado para ${newStatus}.`
  };

  // Criar notificação para o cliente (se houver ID de usuário associado)
  if (order.client_id) {
    // Aqui deveríamos buscar o user_id associado ao cliente, mas para simplificar
    // estamos usando o clientId diretamente
    // Idealmente, buscaríamos o user_id associado ao cliente no banco
    await notificationService.createNotification({
      title: message.title,
      description: message.description,
      type: notificationType,
      userId: order.client_id
    });
  }

  // Criar notificação para o técnico (se houver)
  if (order.technician_id) {
    // Também precisaríamos buscar o user_id do técnico
    await notificationService.createNotification({
      title: message.title,
      description: message.description,
      type: notificationType,
      userId: order.technician_id
    });
  }
}

async function createTechnicianAssignedNotification(order: any, technicianName: string) {
  // Notificar cliente sobre designação de técnico
  if (order.client_id) {
    await notificationService.createNotification({
      title: 'Técnico atribuído',
      description: `${technicianName} foi designado para atender sua ordem de serviço.`,
      type: 'info',
      userId: order.client_id
    });
  }

  // Notificar técnico sobre nova atribuição
  if (order.technician_id) {
    await notificationService.createNotification({
      title: 'Nova atribuição de serviço',
      description: `Você foi designado para atender a OS de ${order.client_name}.`,
      type: 'info',
      userId: order.technician_id
    });
  }
}

function getNotificationTypeForStatus(status: string): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'warning';
    case 'in_progress':
      return 'info';
    default:
      return 'info';
  }
}
