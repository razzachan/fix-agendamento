import { supabase } from '@/integrations/supabase/client';
import { ServiceOrder } from '@/types';
import { WarrantyService, WarrantyStatus, calculateWarrantyEndDate, calculateWarrantyStatus } from '@/types/warranty';
import { v4 as uuidv4 } from 'uuid';

/**
 * Serviço para gerenciamento de garantia
 */
export const warrantyService = {
  /**
   * Atualiza as informações de garantia de uma ordem de serviço
   *
   * @param serviceOrderId ID da ordem de serviço
   * @param warrantyPeriod Período de garantia em meses
   * @param warrantyTerms Termos da garantia
   * @returns Verdadeiro se a atualização foi bem-sucedida
   */
  async updateWarrantyInfo(
    serviceOrderId: string,
    warrantyPeriod: number,
    warrantyTerms?: string | null
  ): Promise<boolean> {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar ordem de serviço:', fetchError);
        return false;
      }

      // Calcular data de início da garantia (data de conclusão ou data atual)
      // Se o status for 'completed' mas não tiver completed_date, usar a data atual
      const warrantyStartDate = order.completed_date || (order.status === 'completed' ? new Date().toISOString() : new Date().toISOString());

      // Calcular data de término da garantia
      const warrantyEndDate = calculateWarrantyEndDate(warrantyStartDate, warrantyPeriod);

      // Atualizar a ordem de serviço
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          warranty_period: warrantyPeriod,
          warranty_start_date: warrantyStartDate,
          warranty_end_date: warrantyEndDate,
          warranty_terms: warrantyTerms
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('Erro ao atualizar informações de garantia:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar informações de garantia:', error);
      return false;
    }
  },

  /**
   * Cria uma nova ordem de serviço em garantia
   *
   * @param originalOrderId ID da ordem de serviço original
   * @param description Descrição do problema
   * @param scheduledDate Data agendada (opcional)
   * @param scheduledTime Hora agendada (opcional)
   * @returns A nova ordem de serviço ou null em caso de erro
   */
  async createWarrantyOrder(
    originalOrderId: string,
    description: string,
    scheduledDate: string | null = null,
    scheduledTime: string | null = null
  ): Promise<ServiceOrder | null> {
    try {
      // Buscar a ordem original
      const { data: originalOrder, error: fetchError } = await supabase
        .from('service_orders')
        .select('*')
        .eq('id', originalOrderId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar ordem de serviço original:', fetchError);
        return null;
      }

      // Criar nova ordem com base na original
      const newOrderId = uuidv4();

      // Criar objeto com os campos necessários, excluindo scheduled_time
      const newOrder = {
        id: newOrderId,
        client_id: originalOrder.client_id,
        client_name: originalOrder.client_name,
        client_email: originalOrder.client_email,
        client_phone: originalOrder.client_phone,
        client_cpf_cnpj: originalOrder.client_cpf_cnpj,
        client_address_complement: originalOrder.client_address_complement,
        client_address_reference: originalOrder.client_address_reference,
        client_city: originalOrder.client_city,
        client_state: originalOrder.client_state,
        client_zip_code: originalOrder.client_zip_code,
        client_full_address: originalOrder.client_full_address,
        technician_id: null, // Será atribuído posteriormente
        technician_name: null,
        // Se tiver data agendada, usar status 'scheduled', caso contrário 'pending'
        status: scheduledDate ? 'scheduled' : 'pending',
        created_at: new Date().toISOString(),
        scheduled_date: scheduledDate,
        // Não usar scheduled_time pois a coluna não existe no banco de dados
        completed_date: null,
        description: `ATENDIMENTO EM GARANTIA: ${description}`,
        equipment_type: originalOrder.equipment_type,
        equipment_model: originalOrder.equipment_model,
        equipment_serial: originalOrder.equipment_serial,
        needs_pickup: originalOrder.needs_pickup,
        pickup_address: originalOrder.pickup_address,
        pickup_city: originalOrder.pickup_city,
        pickup_state: originalOrder.pickup_state,
        pickup_zip_code: originalOrder.pickup_zip_code,
        current_location: originalOrder.current_location,
        service_attendance_type: originalOrder.service_attendance_type,
        related_warranty_order_id: originalOrderId,
        warranty_period: 0, // Ordens em garantia não têm garantia adicional
        warranty_start_date: null,
        warranty_end_date: null,
        warranty_terms: 'Atendimento em garantia da ordem #' + originalOrderId
      };

      // Inserir a nova ordem
      const { data, error: insertError } = await supabase
        .from('service_orders')
        .insert(newOrder)
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar ordem de serviço em garantia:', insertError);
        return null;
      }

      // Registrar o serviço em garantia
      await this.registerWarrantyService(originalOrderId, newOrderId);

      // Mapear para o formato da aplicação
      return {
        id: data.id,
        clientId: data.client_id,
        clientName: data.client_name,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        clientCpfCnpj: data.client_cpf_cnpj,
        clientAddressComplement: data.client_address_complement,
        clientAddressReference: data.client_address_reference,
        clientCity: data.client_city,
        clientState: data.client_state,
        clientZipCode: data.client_zip_code,
        clientFullAddress: data.client_full_address,
        technicianId: data.technician_id,
        technicianName: data.technician_name,
        status: data.status,
        createdAt: data.created_at,
        scheduledDate: data.scheduled_date,
        scheduledTime: scheduledTime, // Usar o valor passado como parâmetro
        completedDate: data.completed_date,
        description: data.description,
        equipmentType: data.equipment_type,
        equipmentModel: data.equipment_model,
        equipmentSerial: data.equipment_serial,
        needsPickup: data.needs_pickup,
        pickupAddress: data.pickup_address,
        pickupCity: data.pickup_city,
        pickupState: data.pickup_state,
        pickupZipCode: data.pickup_zip_code,
        currentLocation: data.current_location,
        serviceAttendanceType: data.service_attendance_type,
        clientDescription: description, // Usar a descrição passada como parâmetro
        images: [],
        serviceItems: [],
        relatedWarrantyOrderId: data.related_warranty_order_id,
        warrantyPeriod: data.warranty_period,
        warrantyStartDate: data.warranty_start_date,
        warrantyEndDate: data.warranty_end_date,
        warrantyTerms: data.warranty_terms
      };
    } catch (error) {
      console.error('Erro ao criar ordem de serviço em garantia:', error);
      return null;
    }
  },

  /**
   * Registra um serviço em garantia
   *
   * @param originalOrderId ID da ordem de serviço original
   * @param warrantyOrderId ID da ordem de serviço em garantia
   * @param notes Observações sobre o serviço em garantia
   * @returns Verdadeiro se o registro foi bem-sucedido
   */
  async registerWarrantyService(
    originalOrderId: string,
    warrantyOrderId: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const warrantyService = {
        id: uuidv4(),
        original_order_id: originalOrderId,
        warranty_order_id: warrantyOrderId,
        created_at: new Date().toISOString(),
        notes: notes || 'Atendimento em garantia'
      };

      const { error } = await supabase
        .from('warranty_services')
        .insert(warrantyService);

      if (error) {
        console.error('Erro ao registrar serviço em garantia:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao registrar serviço em garantia:', error);
      return false;
    }
  },

  /**
   * Obtém o status de garantia de uma ordem de serviço
   *
   * @param serviceOrder Ordem de serviço
   * @returns Status de garantia
   */
  getWarrantyStatus(serviceOrder: ServiceOrder): WarrantyStatus {
    return calculateWarrantyStatus(
      serviceOrder.warrantyStartDate || null,
      serviceOrder.warrantyEndDate || null,
      serviceOrder.relatedWarrantyOrderId || null
    );
  },

  /**
   * Verifica se uma ordem está em período de garantia
   *
   * @param serviceOrder Ordem de serviço
   * @returns Verdadeiro se estiver em garantia
   */
  isInWarranty(serviceOrder: ServiceOrder): boolean {
    if (!serviceOrder.warrantyStartDate || !serviceOrder.warrantyEndDate) {
      return false;
    }

    const now = new Date();
    const endDate = new Date(serviceOrder.warrantyEndDate);

    return now <= endDate;
  },

  /**
   * Obtém os serviços em garantia relacionados a uma ordem
   *
   * @param serviceOrderId ID da ordem de serviço
   * @returns Lista de serviços em garantia
   */
  async getRelatedWarrantyServices(serviceOrderId: string): Promise<WarrantyService[]> {
    try {
      // Buscar serviços onde esta ordem é a original
      const { data, error } = await supabase
        .from('warranty_services')
        .select('*')
        .eq('original_order_id', serviceOrderId);

      if (error) {
        console.error('Erro ao buscar serviços em garantia:', error);
        return [];
      }

      // Mapeia os dados do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
      return data.map(item => ({
        id: item.id,
        originalOrderId: item.original_order_id, // Mapeia original_order_id para originalOrderId
        warrantyOrderId: item.warranty_order_id, // Mapeia warranty_order_id para warrantyOrderId
        createdAt: item.created_at, // Mapeia created_at para createdAt
        notes: item.notes
      }));
    } catch (error) {
      console.error('Erro ao buscar serviços em garantia:', error);
      return [];
    }
  }
};
