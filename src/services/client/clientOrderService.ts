import { supabase } from '@/integrations/supabase/client';
import { translateStatus } from '@/utils/statusMapping';
import { ClientOrder } from '@/hooks/client/useClientOrders';
import serviceOrderProgressService from '@/services/serviceOrderProgress/serviceOrderProgressService';

export const clientOrderService = {
  /**
   * Busca todas as ordens de serviço de um cliente
   */
  async getClientOrders(clientId: string): Promise<ClientOrder[]> {
    try {
      // Primeiro, buscar o cliente para pegar o ID correto
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Erro ao buscar cliente:', clientError);
        // Se não encontrar por ID, tentar buscar por email (para contas demo)
        const { data: clientByEmail, error: emailError } = await supabase
          .from('clients')
          .select('id, name, email, phone')
          .eq('email', 'betonipaulo@gmail.com')
          .single();

        if (emailError) {
          console.error('Cliente não encontrado por email também:', emailError);
          // Retornar array vazio em vez de erro para contas demo
          return [];
        }

        // Usar dados do cliente encontrado por email
        const client = clientByEmail;
      }

      // Buscar ordens por client_id ou por dados do cliente (email, telefone)
      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_name,
          client_phone,
          client_email,
          equipment_type,
          equipment_model,
          equipment_serial,
          status,
          current_location,
          created_at,
          scheduled_date,
          description,
          final_cost,
          initial_cost,
          technician_name,
          technician_id,
          pickup_address,
          service_attendance_type,
          technicians:technician_id (
            name,
            phone
          )
        `)
        .or(`client_id.eq.${clientId},client_email.eq.${client.email},client_phone.eq.${client.phone}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ordens:', error);
        throw new Error('Erro ao carregar suas ordens de serviço.');
      }

      console.log('🔍 [clientOrderService] Ordens encontradas:', orders.length);
      if (orders.length > 0) {
        console.log('🔍 [clientOrderService] Primeira ordem - Status:', orders[0].status);
        console.log('🔍 [clientOrderService] Primeira ordem - Dados:', {
          id: orders[0].id,
          status: orders[0].status,
          client_name: orders[0].client_name,
          equipment_type: orders[0].equipment_type
        });
      }

      // Buscar timeline e imagens para todas as ordens
      const ordersWithTimeline = await Promise.all(
        orders.map(async (order, index) => {
          // Buscar imagens da ordem
          const { data: imageData } = await supabase
            .from('service_order_images')
            .select('*')
            .eq('service_order_id', order.id);

          const images = imageData ? imageData.map(img => ({
            id: img.id,
            url: img.url,
            name: img.name
          })) : [];

          // Buscar dados de diagnóstico se for coleta diagnóstico
          let diagnosisData = null;
          if (order.service_attendance_type === 'coleta_diagnostico') {
            const { data: diagnosisEvents } = await supabase
              .from('service_events')
              .select('description, created_at')
              .eq('service_order_id', order.id)
              .eq('type', 'diagnosis')
              .order('created_at', { ascending: false })
              .limit(1);

            if (diagnosisEvents && diagnosisEvents.length > 0) {
              try {
                console.log('🔍 [clientOrderService] Dados brutos do diagnóstico:', diagnosisEvents[0].description);
                const diagnosisJson = JSON.parse(diagnosisEvents[0].description);
                console.log('🔍 [clientOrderService] JSON parseado:', diagnosisJson);

                diagnosisData = {
                  description: diagnosisJson.diagnosis_details || diagnosisJson.diagnosisDetails || diagnosisJson.notes,
                  recommendedService: diagnosisJson.recommended_service || diagnosisJson.recommendedService || 'Serviço conforme orçamento',
                  estimatedCost: diagnosisJson.estimated_cost || diagnosisJson.estimatedCost || diagnosisJson.total_cost
                };

                console.log('🔍 [clientOrderService] Dados mapeados:', diagnosisData);
              } catch (error) {
                console.error('Erro ao parsear dados de diagnóstico:', error);
              }
            }
          }

          const translatedStatus = translateStatus(order.status);
          console.log('🔍 [clientOrderService] Status traduzido:', order.status, '->', translatedStatus);

          return {
            id: order.id,
            orderNumber: order.order_number || `OS #${orders.length - index}`, // Usar order_number do banco ou fallback
            equipmentType: order.equipment_type || 'Equipamento',
            equipmentModel: order.equipment_model || '',
            equipmentBrand: '', // Campo removido do banco
            equipmentSerial: order.equipment_serial || '',
            status: order.status,
            statusLabel: translatedStatus,
            currentLocation: order.current_location || '',
            locationLabel: this.translateLocation(order.current_location),
            createdAt: order.created_at,
            scheduledDate: order.scheduled_date,
            description: order.description || '',
            finalCost: order.final_cost,
            initialCost: order.initial_cost, // ✅ Valor inicial
            serviceAttendanceType: order.service_attendance_type, // ✅ Tipo de atendimento
            images: images, // ✅ Adicionar imagens
            technician: order.technician_name ? {
              name: order.technician_name,
              phone: order.technicians?.phone || ''
            } : undefined,
            diagnosis: diagnosisData, // ✅ Dados de diagnóstico
            estimatedCompletion: this.calculateEstimatedCompletion(order.status, order.created_at, order.service_attendance_type, order.scheduled_date),
            timeline: await this.getOrderTimelineFromService(order.id)
          };
        })
      );

      return ordersWithTimeline;

    } catch (error: any) {
      console.error('Erro no clientOrderService.getClientOrders:', error);
      throw new Error(error.message || 'Erro ao carregar ordens de serviço.');
    }
  },

  /**
   * Busca uma ordem específica por ID
   */
  async getOrderById(orderId: string): Promise<ClientOrder | null> {
    try {
      const { data: order, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_name,
          client_phone,
          client_email,
          equipment_type,
          equipment_model,
          equipment_serial,
          status,
          current_location,
          created_at,
          scheduled_date,
          description,
          final_cost,
          initial_cost,
          technician_name,
          technician_id,
          pickup_address,
          service_attendance_type,
          technicians:technician_id (
            name,
            phone
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Erro ao buscar ordem:', error);
        return null;
      }

      // Buscar imagens da ordem
      const { data: imageData } = await supabase
        .from('service_order_images')
        .select('*')
        .eq('service_order_id', order.id);

      const images = imageData ? imageData.map(img => ({
        id: img.id,
        url: img.url,
        name: img.name
      })) : [];

      // Buscar dados de diagnóstico se for coleta diagnóstico
      let diagnosisData = null;
      if (order.service_attendance_type === 'coleta_diagnostico') {
        const { data: diagnosisEvents } = await supabase
          .from('service_events')
          .select('description, created_at')
          .eq('service_order_id', order.id)
          .eq('type', 'diagnosis')
          .order('created_at', { ascending: false })
          .limit(1);

        if (diagnosisEvents && diagnosisEvents.length > 0) {
          try {
            const diagnosisJson = JSON.parse(diagnosisEvents[0].description);
            diagnosisData = {
              description: diagnosisJson.diagnosis_details || diagnosisJson.diagnosisDetails || diagnosisJson.notes,
              recommendedService: diagnosisJson.recommended_service || diagnosisJson.recommendedService || 'Serviço conforme orçamento',
              estimatedCost: diagnosisJson.estimated_cost || diagnosisJson.estimatedCost || diagnosisJson.total_cost
            };
          } catch (error) {
            console.error('Erro ao parsear dados de diagnóstico:', error);
          }
        }
      }

      return {
        id: order.id,
        orderNumber: order.order_number || 'OS #001', // Usar order_number do banco ou fallback
        equipmentType: order.equipment_type || 'Equipamento',
        equipmentModel: order.equipment_model || '',
        equipmentBrand: '', // Campo removido do banco
        equipmentSerial: order.equipment_serial || '',
        status: order.status,
        statusLabel: translateStatus(order.status),
        currentLocation: order.current_location || '',
        locationLabel: this.translateLocation(order.current_location),
        createdAt: order.created_at,
        scheduledDate: order.scheduled_date,
        description: order.description || '',
        finalCost: order.final_cost,
        initialCost: order.initial_cost, // ✅ Valor inicial
        serviceAttendanceType: order.service_attendance_type, // ✅ Tipo de atendimento
        images: images, // ✅ Adicionar imagens
        technician: order.technician_name ? {
          name: order.technician_name,
          phone: order.technicians?.phone || ''
        } : undefined,
        diagnosis: diagnosisData, // ✅ Dados de diagnóstico
        estimatedCompletion: this.calculateEstimatedCompletion(order.status, order.created_at, order.service_attendance_type, order.scheduled_date),
        timeline: await this.getOrderTimelineFromService(order.id)
      };

    } catch (error: any) {
      console.error('Erro no clientOrderService.getOrderById:', error);
      return null;
    }
  },

  /**
   * Traduz localização para texto amigável
   */
  translateLocation(location: string): string {
    const locationMap: Record<string, string> = {
      'client': 'Com o Cliente',
      'workshop': 'Na Oficina',
      'technician': 'Com o Técnico',
      'delivery': 'Em Entrega',
      'completed': 'Entregue'
    };

    return locationMap[location] || location;
  },

  /**
   * Calcula estimativa de conclusão baseada no status e tipo de serviço
   */
  calculateEstimatedCompletion(status: string, createdAt: string, serviceType?: string, scheduledDate?: string): string {
    const created = new Date(createdAt);
    const now = new Date();

    // Para serviços de coleta (diagnóstico ou conserto), usar prazo padrão de 7 dias úteis
    if (serviceType === 'Coleta diagnostico' || serviceType === 'Coleta conserto') {
      const estimatedDate = this.addBusinessDays(now, 7);
      return estimatedDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }

    // Para serviços em domicílio
    if (serviceType === 'Em domicilio') {
      // Se já está agendado, usar a data agendada (serviço no mesmo dia)
      if (scheduledDate && (status === 'scheduled' || status === 'in_progress')) {
        const scheduled = new Date(scheduledDate);
        return scheduled.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }

      // Se já foi concluído, não precisa de previsão
      if (status === 'completed') {
        return 'Concluído';
      }
    }

    // Para outros casos, usar estimativas baseadas no status
    const estimativeDays: Record<string, number> = {
      'scheduled': 1,
      'in_progress': 0, // Mesmo dia se em andamento
      'at_workshop': 3,
      'diagnosis_completed': 1,
      'quote_sent': 7, // Aguardando cliente
      'quote_approved': 2,
      'ready_for_delivery': 1,
      'completed': 0
    };

    const days = estimativeDays[status] || 1;
    const estimatedDate = this.addBusinessDays(now, days);

    return estimatedDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Adiciona dias úteis a uma data (não conta fins de semana)
   */
  addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;

    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      // Se não for sábado (6) nem domingo (0), conta como dia útil
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }

    return result;
  },

  /**
   * Traduz notas que podem estar em inglês
   */
  translateNotes(notes: string): string {
    if (!notes) return notes;

    // Padrões comuns de notas em inglês que precisam ser traduzidos
    const translations: Record<string, string> = {
      'Status alterado para scheduled': 'Status alterado para: Agendado',
      'Status alterado para on_the_way': 'Status alterado para: A Caminho',
      'Status alterado para in_progress': 'Status alterado para: Em Andamento',
      'Status alterado para collected': 'Status alterado para: Coletado',
      'Status alterado para at_workshop': 'Status alterado para: Na Oficina',
      'Status alterado para diagnosis_completed': 'Status alterado para: Diagnóstico Concluído',
      'Status alterado para awaiting_quote_approval': 'Status alterado para: Aguardando Aprovação do Orçamento',
      'Status alterado para quote_approved': 'Status alterado para: Orçamento Aprovado',
      'Status alterado para ready_for_delivery': 'Status alterado para: Pronto para Entrega',
      'Status alterado para completed': 'Status alterado para: Concluído',
      'Status changed to scheduled': 'Status alterado para: Agendado',
      'Status changed to on_the_way': 'Status alterado para: A Caminho',
      'Status changed to in_progress': 'Status alterado para: Em Andamento',
      'Status changed to collected': 'Status alterado para: Coletado',
      'Status changed to at_workshop': 'Status alterado para: Na Oficina',
      'Status changed to diagnosis_completed': 'Status alterado para: Diagnóstico Concluído',
      'Status changed to awaiting_quote_approval': 'Status alterado para: Aguardando Aprovação do Orçamento',
      'Status changed to quote_approved': 'Status alterado para: Orçamento Aprovado',
      'Status changed to ready_for_delivery': 'Status alterado para: Pronto para Entrega',
      'Status changed to delivery_scheduled': 'Status alterado para: Entrega Agendada',
      'Status changed to collected_for_delivery': 'Status alterado para: Coletado para Entrega',
      'Status changed to completed': 'Status alterado para: Concluído'
    };

    // Verificar se a nota corresponde exatamente a alguma tradução
    if (translations[notes]) {
      return translations[notes];
    }

    // Tentar traduzir padrões com regex
    let translatedNotes = notes;

    // Padrão: "Status alterado para X" ou "Status changed to X"
    translatedNotes = translatedNotes.replace(
      /Status (alterado para|changed to) (\w+)/g,
      (match, verb, status) => `Status alterado para: ${translateStatus(status)}`
    );

    return translatedNotes;
  },

  /**
   * Busca o timeline/histórico usando o serviço existente
   */
  async getOrderTimelineFromService(orderId: string) {
    try {
      const progressEntries = await serviceOrderProgressService.getServiceOrderProgress(orderId);
      console.log('🔍 Timeline para ordem', orderId, ':', progressEntries);

      const timeline = progressEntries.map(entry => {
        let description = entry.notes || `Status alterado para: ${translateStatus(entry.status)}`;

        // Traduzir notas que podem estar em inglês
        if (entry.notes) {
          description = this.translateNotes(entry.notes);
        }

        return {
          date: entry.createdAt,
          description: description,
          status: entry.status,
          createdBy: entry.createdBy
        };
      });

      console.log('📋 Timeline formatado:', timeline);
      return timeline;
    } catch (error) {
      console.error('Erro ao buscar timeline:', error);
      return [];
    }
  },

  /**
   * Gera timeline de progresso da ordem
   */
  generateTimeline(order: any) {
    const timeline = [];
    const created = new Date(order.created_at);

    // Status inicial
    timeline.push({
      status: 'created',
      date: order.created_at,
      description: 'Ordem de serviço criada'
    });

    // Adicionar marcos baseados no status atual
    if (order.scheduled_date) {
      timeline.push({
        status: 'scheduled',
        date: order.scheduled_date,
        description: 'Serviço agendado'
      });
    }

    // Adicionar status atual se não for o inicial
    if (order.status !== 'scheduled' && order.status !== 'pending') {
      timeline.push({
        status: order.status,
        date: new Date().toISOString(),
        description: translateStatus(order.status)
      });
    }

    return timeline;
  }
};
