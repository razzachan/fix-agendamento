import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder, UserRole } from '@/types';
import { translateServiceType, formatDateBR } from '@/utils/translations';
import { getDisplayNumber } from '@/utils/orderNumberUtils';

export interface NotificationTemplate {
  id: string;
  event: NotificationEvent;
  roles: UserRole[];
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: NotificationChannel[];
}

export type NotificationEvent =
  | 'order_created'
  | 'order_assigned'
  | 'status_changed'
  | 'technician_assigned'
  | 'technician_checked_in'
  | 'technician_checked_out'
  | 'equipment_collected'
  | 'equipment_at_workshop'
  | 'diagnosis_completed'
  | 'quote_sent'
  | 'quote_approved'
  | 'quote_rejected'
  | 'repair_completed'
  | 'payment_received'
  | 'order_completed'
  | 'order_cancelled'
  | 'workshop_assigned'
  | 'equipment_ready_delivery'
  | 'equipment_delivered';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface NotificationContext {
  serviceOrder: ServiceOrder;
  previousStatus?: string;
  newStatus?: string;
  technicianName?: string;
  workshopName?: string;
  paymentAmount?: number;
  additionalData?: Record<string, any>;
}

/**
 * Engine robusto de notificações para todo o ciclo de vida das ordens de serviço
 */
export class NotificationEngine {
  private templates: NotificationTemplate[] = [
    // Criação de ordem
    {
      id: 'order_created_admin',
      event: 'order_created',
      roles: ['admin'],
      title: 'Nova ordem de serviço criada',
      description: 'Uma nova OS foi criada para {clientName} - {equipmentType} {equipmentModel}. Tipo de atendimento: {serviceType}. Endereço: {clientAddress}',
      type: 'info',
      priority: 'medium',
      channels: ['in_app', 'email']
    },
    
    // Atribuição de técnico
    {
      id: 'technician_assigned_client',
      event: 'technician_assigned',
      roles: ['client'],
      title: 'Técnico atribuído ao seu serviço',
      description: '{technicianName} foi designado para atender sua OS de {equipmentType} {equipmentModel}. Agendado para: {scheduledDate}. Endereço: {clientAddress}',
      type: 'info',
      priority: 'medium',
      channels: ['in_app', 'sms']
    },
    {
      id: 'technician_assigned_technician',
      event: 'technician_assigned',
      roles: ['technician'],
      title: 'Nova ordem atribuída',
      description: 'Você foi designado para atender a OS de {clientName} - {equipmentType} {equipmentModel}. Agendado para: {scheduledDate}. Endereço: {clientAddress}. Problema: {problemDescription}',
      type: 'info',
      priority: 'high',
      channels: ['in_app', 'push']
    },

    // Mudanças de status críticas
    {
      id: 'status_collected_client',
      event: 'equipment_collected',
      roles: ['client'],
      title: 'Equipamento coletado',
      description: 'Seu {equipmentType} {equipmentModel} foi coletado pelo técnico {technicianName} e está sendo encaminhado para análise. OS #{serviceOrderId}',
      type: 'success',
      priority: 'medium',
      channels: ['in_app', 'sms']
    },
    {
      id: 'status_at_workshop_client',
      event: 'equipment_at_workshop',
      roles: ['client'],
      title: 'Equipamento na oficina',
      description: 'Seu {equipmentType} {equipmentModel} chegou na oficina {workshopName} para reparo. Tipo de atendimento: {serviceType}. OS #{serviceOrderId}',
      type: 'info',
      priority: 'medium',
      channels: ['in_app']
    },
    {
      id: 'status_at_workshop_workshop',
      event: 'equipment_at_workshop',
      roles: ['workshop'],
      title: 'Novo equipamento recebido',
      description: 'Equipamento {equipmentType} {equipmentModel} de {clientName} foi recebido para reparo. Problema: {problemDescription}. Tipo: {serviceType}. OS #{serviceOrderId}',
      type: 'info',
      priority: 'high',
      channels: ['in_app', 'email']
    },

    // Diagnóstico
    {
      id: 'diagnosis_completed_client',
      event: 'diagnosis_completed',
      roles: ['client'],
      title: 'Diagnóstico concluído',
      description: 'O diagnóstico do seu {equipmentType} {equipmentModel} foi concluído pela oficina {workshopName}. Aguardando aprovação do orçamento. OS #{serviceOrderId}',
      type: 'info',
      priority: 'high',
      channels: ['in_app', 'sms', 'email']
    },
    {
      id: 'diagnosis_completed_admin',
      event: 'diagnosis_completed',
      roles: ['admin'],
      title: 'Diagnóstico disponível',
      description: 'Diagnóstico da OS de {clientName} - {equipmentType} {equipmentModel} concluído pela oficina {workshopName}. Aguardando aprovação do orçamento. OS #{serviceOrderId}',
      type: 'info',
      priority: 'medium',
      channels: ['in_app']
    },

    // Orçamento enviado (aguardando aprovação)
    {
      id: 'quote_sent_admin',
      event: 'quote_sent',
      roles: ['admin'],
      title: '💰 Orçamento aguardando aprovação',
      description: 'Orçamento para {clientName} - {equipmentType} {equipmentModel} está aguardando aprovação do cliente. Valor: R$ {totalCost}. Prazo: {estimatedDays} dias. OS #{serviceOrderId}',
      type: 'warning',
      priority: 'high',
      channels: ['in_app']
    },
    {
      id: 'quote_sent_client',
      event: 'quote_sent',
      roles: ['client'],
      title: '💰 Orçamento disponível',
      description: 'Orçamento para seu {equipmentType} {equipmentModel} está pronto. Valor: R$ {totalCost}. Prazo: {estimatedDays} dias. Acesse para aprovar ou rejeitar. OS #{serviceOrderId}',
      type: 'info',
      priority: 'high',
      channels: ['in_app', 'sms', 'email']
    },

    // Orçamento aprovado
    {
      id: 'quote_approved_workshop',
      event: 'quote_approved',
      roles: ['workshop'],
      title: 'Orçamento aprovado',
      description: 'Orçamento para {equipmentType} {equipmentModel} de {clientName} foi aprovado. Valor: R$ {approvedAmount}. Iniciar reparo imediatamente. OS #{serviceOrderId}',
      type: 'success',
      priority: 'high',
      channels: ['in_app', 'email']
    },

    // Orçamento rejeitado
    {
      id: 'quote_rejected_workshop',
      event: 'quote_rejected',
      roles: ['workshop'],
      title: 'Orçamento rejeitado',
      description: 'Orçamento para {equipmentType} {equipmentModel} de {clientName} foi rejeitado pelo cliente. Feche o equipamento para entrega. OS #{serviceOrderId}',
      type: 'warning',
      priority: 'high',
      channels: ['in_app', 'email']
    },

    // Equipamento pronto para entrega
    {
      id: 'equipment_ready_delivery_admin',
      event: 'equipment_ready_delivery',
      roles: ['admin'],
      title: '📦 Equipamento pronto para entrega',
      description: 'Equipamento {equipmentType} {equipmentModel} de {clientName} está pronto para entrega. Agende a entrega com o cliente. OS #{serviceOrderId}',
      type: 'success',
      priority: 'high',
      channels: ['in_app', 'email']
    },
    {
      id: 'quote_approved_client',
      event: 'quote_approved',
      roles: ['client'],
      title: 'Orçamento aprovado',
      description: 'Seu orçamento foi aprovado. O reparo do {equipmentType} {equipmentModel} será iniciado pela oficina {workshopName}. Valor: R$ {approvedAmount}. OS #{serviceOrderId}',
      type: 'success',
      priority: 'medium',
      channels: ['in_app', 'sms']
    },

    // Reparo concluído
    {
      id: 'repair_completed_client',
      event: 'repair_completed',
      roles: ['client'],
      title: 'Reparo concluído',
      description: 'O reparo do seu {equipmentType} foi concluído. Aguardando entrega.',
      type: 'success',
      priority: 'high',
      channels: ['in_app', 'sms', 'email']
    },
    {
      id: 'repair_completed_admin',
      event: 'repair_completed',
      roles: ['admin'],
      title: 'Reparo finalizado',
      description: 'Reparo da OS de {clientName} concluído. Pronto para entrega.',
      type: 'success',
      priority: 'medium',
      channels: ['in_app']
    },

    // Pagamento
    {
      id: 'payment_received_admin',
      event: 'payment_received',
      roles: ['admin'],
      title: 'Pagamento recebido',
      description: 'Pagamento de R$ {paymentAmount} recebido para OS de {clientName}',
      type: 'success',
      priority: 'medium',
      channels: ['in_app']
    },
    {
      id: 'payment_received_client',
      event: 'payment_received',
      roles: ['client'],
      title: 'Pagamento confirmado',
      description: 'Seu pagamento de R$ {paymentAmount} foi confirmado.',
      type: 'success',
      priority: 'medium',
      channels: ['in_app', 'sms']
    },

    // Conclusão
    {
      id: 'order_completed_client',
      event: 'order_completed',
      roles: ['client'],
      title: 'Serviço concluído',
      description: 'Sua ordem de serviço para {equipmentType} {equipmentModel} foi concluída com sucesso! Técnico: {technicianName}. Valor total: R$ {totalAmount}. OS #{serviceOrderId}',
      type: 'success',
      priority: 'high',
      channels: ['in_app', 'sms', 'email']
    },
    {
      id: 'order_completed_admin',
      event: 'order_completed',
      roles: ['admin'],
      title: 'OS finalizada',
      description: 'OS de {clientName} - {equipmentType} {equipmentModel} foi concluída. Técnico: {technicianName}. Valor: R$ {totalAmount}. OS #{serviceOrderId}',
      type: 'success',
      priority: 'low',
      channels: ['in_app']
    },

    // Check-in do técnico
    {
      id: 'technician_checked_in_client',
      event: 'technician_checked_in',
      roles: ['client'],
      title: 'Técnico chegou ao local',
      description: 'O técnico {technicianName} chegou ao local para atender seu {equipmentType} {equipmentModel}. OS #{serviceOrderId}',
      type: 'info',
      priority: 'high',
      channels: ['in_app', 'sms']
    },
    {
      id: 'technician_checked_in_admin',
      event: 'technician_checked_in',
      roles: ['admin'],
      title: 'Técnico no local',
      description: 'Técnico {technicianName} fez check-in na OS de {clientName} - {equipmentType} {equipmentModel}. Local: {location}. OS #{serviceOrderId}',
      type: 'info',
      priority: 'low',
      channels: ['in_app']
    },

    // Check-out do técnico
    {
      id: 'technician_checked_out_client',
      event: 'technician_checked_out',
      roles: ['client'],
      title: 'Atendimento finalizado',
      description: 'O técnico {technicianName} finalizou o atendimento do seu {equipmentType} {equipmentModel}. Tempo de atendimento: {formattedDuration}. OS #{serviceOrderId}',
      type: 'success',
      priority: 'high',
      channels: ['in_app', 'sms']
    },
    {
      id: 'technician_checked_out_admin',
      event: 'technician_checked_out',
      roles: ['admin'],
      title: 'Atendimento concluído',
      description: 'Técnico {technicianName} finalizou atendimento da OS de {clientName} - {equipmentType} {equipmentModel}. Duração: {formattedDuration}. OS #{serviceOrderId}',
      type: 'success',
      priority: 'low',
      channels: ['in_app']
    },

    // Cancelamento
    {
      id: 'order_cancelled_client',
      event: 'order_cancelled',
      roles: ['client'],
      title: 'Serviço cancelado',
      description: 'Sua ordem de serviço para {equipmentType} foi cancelada.',
      type: 'warning',
      priority: 'high',
      channels: ['in_app', 'sms', 'email']
    },
    {
      id: 'order_cancelled_technician',
      event: 'order_cancelled',
      roles: ['technician'],
      title: 'OS cancelada',
      description: 'A OS de {clientName} - {equipmentType} foi cancelada.',
      type: 'warning',
      priority: 'medium',
      channels: ['in_app']
    }
  ];

  /**
   * Dispara notificações baseadas em um evento
   */
  async triggerNotifications(
    event: NotificationEvent,
    context: NotificationContext
  ): Promise<void> {
    try {
      console.log(`🔔 [NotificationEngine] EXECUTANDO - Disparando notificações para evento: ${event}`);
      console.log(`🔔 [NotificationEngine] Contexto:`, context);

      // Buscar templates para o evento
      const eventTemplates = this.templates.filter(template => template.event === event);
      console.log(`🔔 [NotificationEngine] Templates encontrados: ${eventTemplates.length}`);

      for (const template of eventTemplates) {
        console.log(`🔔 [NotificationEngine] Processando template: ${template.id}`);
        await this.processTemplate(template, context);
      }

      console.log(`✅ [NotificationEngine] Notificações processadas para evento: ${event}`);
    } catch (error) {
      console.error(`❌ [NotificationEngine] Erro ao processar notificações:`, error);
    }
  }

  /**
   * Processa um template de notificação
   */
  private async processTemplate(
    template: NotificationTemplate,
    context: NotificationContext
  ): Promise<void> {
    try {
      // Buscar usuários com as roles necessárias
      const targetUsers = await this.getUsersByRoles(template.roles, context);

      for (const user of targetUsers) {
        // Personalizar mensagem
        const personalizedTitle = this.personalizeMessage(template.title, context);
        const personalizedDescription = this.personalizeMessage(template.description, context);

        // Enviar notificação por cada canal
        for (const channel of template.channels) {
          await this.sendNotification(
            channel,
            user.id,
            personalizedTitle,
            personalizedDescription,
            template.type,
            template.priority,
            context
          );
        }
      }
    } catch (error) {
      console.error(`❌ [NotificationEngine] Erro ao processar template ${template.id}:`, error);
    }
  }

  /**
   * Busca usuários pelas roles, considerando o contexto da ordem
   */
  private async getUsersByRoles(
    roles: UserRole[],
    context: NotificationContext
  ): Promise<Array<{ id: string; role: UserRole; email?: string; phone?: string }>> {
    const users: Array<{ id: string; role: UserRole; email?: string; phone?: string }> = [];

    for (const role of roles) {
      switch (role) {
        case 'admin':
          // Para evitar duplicação, enviar apenas para o admin principal
          const { data: admins } = await supabase
            .from('users')
            .select('id, role, email, phone')
            .eq('role', 'admin')
            .limit(1);
          if (admins && admins.length > 0) users.push(admins[0]);
          break;

        case 'client':
          if (context.serviceOrder.clientId) {
            const { data: client } = await supabase
              .from('users')
              .select('id, role, email, phone')
              .eq('id', context.serviceOrder.clientId)
              .single();
            if (client) {
              users.push(client);
            } else {
              console.warn(`⚠️ Cliente ${context.serviceOrder.clientId} não encontrado para notificação`);
            }
          } else {
            console.warn(`⚠️ ClientId não definido na ordem ${context.serviceOrder.id} para notificação`);
          }
          break;

        case 'technician':
          if (context.serviceOrder.technicianId) {
            const { data: technician } = await supabase
              .from('users')
              .select('id, role, email, phone')
              .eq('id', context.serviceOrder.technicianId)
              .single();
            if (technician) {
              users.push(technician);
            } else {
              console.warn(`⚠️ Técnico ${context.serviceOrder.technicianId} não encontrado para notificação`);
            }
          } else {
            console.warn(`⚠️ TechnicianId não definido na ordem ${context.serviceOrder.id} para notificação`);
          }
          break;

        case 'workshop':
          if (context.serviceOrder.workshopId) {
            const { data: workshop } = await supabase
              .from('users')
              .select('id, role, email, phone')
              .eq('id', context.serviceOrder.workshopId)
              .single();
            if (workshop) {
              users.push(workshop);
            } else {
              console.warn(`⚠️ Oficina ${context.serviceOrder.workshopId} não encontrada para notificação`);
            }
          } else {
            console.warn(`⚠️ WorkshopId não definido na ordem ${context.serviceOrder.id} para notificação`);
          }
          break;
      }
    }

    return users;
  }

  /**
   * Personaliza mensagens com dados do contexto
   */
  private personalizeMessage(message: string, context: NotificationContext): string {
    const order = context.serviceOrder;

    return message
      .replace(/{clientName}/g, (() => {
        // Tentar diferentes campos de nome do cliente
        const clientName = order.clientName || order.client_name || order.customer_name || 'Cliente';
        return clientName;
      })())
      .replace(/{equipmentType}/g, (() => {
        // Tentar diferentes campos de tipo de equipamento
        const equipmentType = order.equipmentType || order.equipment_type || order.service_type || 'Equipamento';
        return equipmentType;
      })())
      .replace(/{equipmentModel}/g, (() => {
        // Tentar diferentes campos de modelo do equipamento
        const equipmentModel = order.equipmentModel || order.equipment_model || order.model || '';
        return equipmentModel ? ` ${equipmentModel}` : '';
      })())
      .replace(/{technicianName}/g, context.technicianName || order.technicianName || 'Técnico')
      .replace(/{workshopName}/g, context.workshopName || order.workshopName || 'Oficina')
      .replace(/{serviceOrderId}/g, (() => {
        // Usar a função getDisplayNumber para formatação consistente
        const displayNumber = getDisplayNumber(order);

        // Se retornou um número válido, remover o prefixo para usar apenas o número
        if (displayNumber && displayNumber !== '#---' && displayNumber !== 'OS #---') {
          return displayNumber.replace(/^(OS\s*#?|AG\s*#?|#)/, '');
        }

        // Fallback: usar ID abreviado mais amigável
        return order.id?.substring(0, 8).toUpperCase() || 'N/A';
      })())
      .replace(/{serviceType}/g, translateServiceType(order.serviceAttendanceType))
      .replace(/{clientAddress}/g, order.clientAddress || 'Endereço não informado')
      .replace(/{problemDescription}/g, order.description || 'Não informado')
      .replace(/{scheduledDate}/g, order.scheduledDate ? formatDateBR(order.scheduledDate) : 'A definir')
      .replace(/{totalAmount}/g, order.totalAmount?.toFixed(2) || '0.00')
      .replace(/{approvedAmount}/g, context.additionalData?.approvedAmount?.toFixed(2) || '0.00')
      .replace(/{paymentAmount}/g, context.paymentAmount?.toFixed(2) || '0.00')
      .replace(/{totalCost}/g, context.additionalData?.totalCost?.toFixed(2) || '0.00')
      .replace(/{estimatedDays}/g, context.additionalData?.estimatedDays?.toString() || 'N/A')
      .replace(/{laborCost}/g, context.additionalData?.laborCost?.toFixed(2) || '0.00')
      .replace(/{partsCost}/g, context.additionalData?.partsCost?.toFixed(2) || '0.00');
  }



  /**
   * Envia notificação por um canal específico
   */
  private async sendNotification(
    channel: NotificationChannel,
    userId: string,
    title: string,
    description: string,
    type: string,
    priority: string,
    context: NotificationContext
  ): Promise<void> {
    switch (channel) {
      case 'in_app':
        await this.sendInAppNotification(userId, title, description, type);
        break;
      case 'email':
        await this.sendEmailNotification(userId, title, description, context);
        break;
      case 'sms':
        await this.sendSMSNotification(userId, title, description);
        break;
      case 'push':
        await this.sendPushNotification(userId, title, description);
        break;
    }
  }

  /**
   * Envia notificação in-app
   */
  private async sendInAppNotification(
    userId: string,
    title: string,
    description: string,
    type: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          description,
          type,
          read: false,
          time: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Erro ao criar notificação in-app:', error);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar notificação in-app:', error);
    }
  }

  /**
   * Placeholder para notificação por email
   */
  private async sendEmailNotification(
    userId: string,
    title: string,
    description: string,
    context: NotificationContext
  ): Promise<void> {
    // TODO: Implementar integração com serviço de email
    console.log(`📧 [Email] ${title} para usuário ${userId}`);
  }

  /**
   * Placeholder para notificação por SMS
   */
  private async sendSMSNotification(
    userId: string,
    title: string,
    description: string
  ): Promise<void> {
    // TODO: Implementar integração com serviço de SMS
    console.log(`📱 [SMS] ${title} para usuário ${userId}`);
  }

  /**
   * Placeholder para notificação push
   */
  private async sendPushNotification(
    userId: string,
    title: string,
    description: string
  ): Promise<void> {
    // TODO: Implementar notificações push
    console.log(`🔔 [Push] ${title} para usuário ${userId}`);
  }
}

// Instância singleton do engine
export const notificationEngine = new NotificationEngine();
