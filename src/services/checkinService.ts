import { supabase } from '@/integrations/supabase/client';
import { notificationTriggers } from './notifications/notificationTriggers';
import { ServiceOrder } from '@/types/serviceOrder';

export interface CheckinData {
  id?: string;
  service_order_id: string;
  technician_id: string;
  checkin_timestamp: string;
  checkin_latitude: number;
  checkin_longitude: number;
  checkin_address?: string;
  checkin_accuracy?: number;
  checkout_timestamp?: string;
  checkout_latitude?: number;
  checkout_longitude?: number;
  checkout_address?: string;
  checkout_accuracy?: number;
  total_duration_minutes?: number;
  distance_from_address_meters?: number;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

/**
 * Serviço para gerenciar check-in e check-out de técnicos
 */
export class CheckinService {
  /**
   * Obter localização atual do usuário
   */
  static async getCurrentLocation(): Promise<GeolocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não é suportada neste navegador'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache por 1 minuto
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          try {
            // Tentar obter endereço via reverse geocoding
            const address = await CheckinService.reverseGeocode(latitude, longitude);
            
            resolve({
              latitude,
              longitude,
              accuracy,
              address
            });
          } catch (error) {
            // Se falhar o reverse geocoding, retornar sem endereço
            resolve({
              latitude,
              longitude,
              accuracy
            });
          }
        },
        (error) => {
          let message = 'Erro ao obter localização';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Permissão de localização negada pelo usuário';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Informações de localização não disponíveis';
              break;
            case error.TIMEOUT:
              message = 'Tempo limite para obter localização excedido';
              break;
          }
          
          reject(new Error(message));
        },
        options
      );
    });
  }

  /**
   * Converter coordenadas em endereço (reverse geocoding)
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Usando API gratuita do OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'EletroFix-Hub-Pro/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro na API de geocodificação');
      }

      const data = await response.json();
      return data.display_name || 'Endereço não encontrado';
    } catch (error) {
      console.warn('Erro no reverse geocoding:', error);
      return 'Endereço não disponível';
    }
  }

  /**
   * Calcular distância entre duas coordenadas (em metros)
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distância em metros
  }

  /**
   * Fazer check-in
   */
  static async checkin(serviceOrderId: string, technicianId: string): Promise<CheckinData> {
    try {
      console.log('🔄 [CheckinService] Iniciando check-in...');
      
      // Obter localização atual
      const location = await CheckinService.getCurrentLocation();
      
      const checkinData = {
        service_order_id: serviceOrderId,
        technician_id: technicianId,
        checkin_timestamp: new Date().toISOString(),
        checkin_latitude: location.latitude,
        checkin_longitude: location.longitude,
        checkin_address: location.address,
        checkin_accuracy: location.accuracy
      };

      const { data, error } = await supabase
        .from('technician_checkins')
        .insert(checkinData)
        .select()
        .single();

      if (error) {
        console.error('❌ [CheckinService] Erro no check-in:', error);
        throw error;
      }

      console.log('✅ [CheckinService] Check-in realizado com sucesso:', data);

      // Automaticamente atualizar status da ordem para "em andamento"
      await CheckinService.autoUpdateOrderStatusOnCheckin(serviceOrderId);

      // Disparar notificações de check-in
      await CheckinService.triggerCheckinNotifications(serviceOrderId, data);

      return data;
    } catch (error) {
      console.error('❌ [CheckinService] Erro geral no check-in:', error);
      throw error;
    }
  }

  /**
   * Fazer check-out
   */
  static async checkout(checkinId: string): Promise<CheckinData> {
    try {
      console.log('🔄 [CheckinService] Iniciando check-out...');
      
      // Obter localização atual
      const location = await CheckinService.getCurrentLocation();
      
      const checkoutData = {
        checkout_timestamp: new Date().toISOString(),
        checkout_latitude: location.latitude,
        checkout_longitude: location.longitude,
        checkout_address: location.address,
        checkout_accuracy: location.accuracy
      };

      const { data, error } = await supabase
        .from('technician_checkins')
        .update(checkoutData)
        .eq('id', checkinId)
        .select()
        .single();

      if (error) {
        console.error('❌ [CheckinService] Erro no check-out:', error);
        throw error;
      }

      console.log('✅ [CheckinService] Check-out realizado com sucesso:', data);

      // Verificar se pode atualizar status da ordem
      await CheckinService.autoUpdateOrderStatusOnCheckout(data.service_order_id);

      // Disparar notificações de check-out
      await CheckinService.triggerCheckoutNotifications(data);

      return data;
    } catch (error) {
      console.error('❌ [CheckinService] Erro geral no check-out:', error);
      throw error;
    }
  }

  /**
   * Obter check-in ativo para uma ordem de serviço
   */
  static async getActiveCheckin(serviceOrderId: string, technicianId: string): Promise<CheckinData | null> {
    try {
      const { data, error } = await supabase
        .from('technician_checkins')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .eq('technician_id', technicianId)
        .is('checkout_timestamp', null)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [CheckinService] Erro ao buscar check-in ativo:', error);
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('❌ [CheckinService] Erro geral ao buscar check-in ativo:', error);
      return null;
    }
  }

  /**
   * Obter histórico de check-ins de um técnico
   */
  static async getCheckinHistory(
    technicianId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<CheckinData[]> {
    try {
      let query = supabase
        .from('technician_checkins')
        .select(`
          *,
          service_orders (
            id,
            client_name,
            equipment_type,
            equipment_model,
            address
          )
        `)
        .eq('technician_id', technicianId)
        .order('checkin_timestamp', { ascending: false });

      if (startDate) {
        query = query.gte('checkin_timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('checkin_timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [CheckinService] Erro ao buscar histórico:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ [CheckinService] Erro geral ao buscar histórico:', error);
      throw error;
    }
  }

  /**
   * Validar se técnico está próximo ao endereço da ordem
   */
  static async validateProximity(
    serviceOrderId: string, 
    currentLat: number, 
    currentLon: number,
    maxDistanceMeters: number = 500
  ): Promise<{ isValid: boolean; distance: number; address?: string }> {
    try {
      // Buscar endereço da ordem de serviço
      const { data: order, error } = await supabase
        .from('service_orders')
        .select('address, latitude, longitude')
        .eq('id', serviceOrderId)
        .single();

      if (error || !order) {
        throw new Error('Ordem de serviço não encontrada');
      }

      // Se não tiver coordenadas salvas, tentar geocodificar o endereço
      let orderLat = order.latitude;
      let orderLon = order.longitude;

      if (!orderLat || !orderLon) {
        // Implementar geocodificação do endereço se necessário
        console.warn('⚠️ Coordenadas da ordem não disponíveis, validação de proximidade desabilitada');
        return { isValid: true, distance: 0, address: order.address };
      }

      // Calcular distância
      const distance = CheckinService.calculateDistance(
        currentLat, currentLon, orderLat, orderLon
      );

      const isValid = distance <= maxDistanceMeters;

      return {
        isValid,
        distance: Math.round(distance),
        address: order.address
      };
    } catch (error) {
      console.error('❌ [CheckinService] Erro na validação de proximidade:', error);
      // Em caso de erro, permitir check-in (fail-safe)
      return { isValid: true, distance: 0 };
    }
  }

  /**
   * Atualizar automaticamente o status da ordem quando técnico faz check-in
   */
  static async autoUpdateOrderStatusOnCheckin(serviceOrderId: string): Promise<void> {
    try {
      // Buscar status atual da ordem
      const { data: order, error } = await supabase
        .from('service_orders')
        .select('status, service_attendance_type')
        .eq('id', serviceOrderId)
        .single();

      if (error || !order) {
        console.warn('⚠️ [CheckinService] Não foi possível buscar ordem para atualização de status:', error);
        return;
      }

      // Só atualizar se estiver em status que permite check-in
      const allowedStatuses = ['scheduled', 'on_the_way'];
      if (!allowedStatuses.includes(order.status)) {
        console.log(`ℹ️ [CheckinService] Status atual "${order.status}" não permite auto-atualização no check-in`);
        return;
      }

      // Atualizar usando o sistema centralizado (com notificações automáticas)
      const { updateServiceOrder } = await import('@/services/serviceOrder/mutations/updateServiceOrder');

      const success = await updateServiceOrder(serviceOrderId, {
        status: 'in_progress',
        updatedByName: 'Sistema - Check-in automático',
        updatedById: null
      });

      if (!success) {
        console.error('❌ [CheckinService] Erro ao atualizar status da ordem');
        return;
      }

      console.log('✅ [CheckinService] Status da ordem atualizado automaticamente para "in_progress" com notificações');
    } catch (error) {
      console.error('❌ [CheckinService] Erro geral ao atualizar status da ordem:', error);
    }
  }

  /**
   * Verificar se ordem pode avançar automaticamente no check-out
   */
  static async autoUpdateOrderStatusOnCheckout(serviceOrderId: string): Promise<void> {
    try {
      // Buscar status atual da ordem
      const { data: order, error } = await supabase
        .from('service_orders')
        .select('status, service_attendance_type')
        .eq('id', serviceOrderId)
        .single();

      if (error || !order) {
        console.warn('⚠️ [CheckinService] Não foi possível buscar ordem para atualização de status:', error);
        return;
      }

      // Para serviços em domicílio, check-out pode indicar conclusão do trabalho
      if (order.service_attendance_type === 'em_domicilio' && order.status === 'in_progress') {
        // Não atualizar automaticamente para "completed" - deixar para o técnico decidir
        // Apenas registrar que o trabalho foi finalizado
        console.log('ℹ️ [CheckinService] Check-out registrado. Técnico deve usar NextStatusButton para finalizar ordem.');
      }

      // Para outros tipos de serviço, check-out pode indicar coleta
      if (order.service_attendance_type !== 'em_domicilio' && order.status === 'in_progress') {
        console.log('ℹ️ [CheckinService] Check-out registrado para serviço de coleta. Técnico deve usar NextStatusButton para próximo status.');
      }
    } catch (error) {
      console.error('❌ [CheckinService] Erro geral ao verificar status da ordem no check-out:', error);
    }
  }

  /**
   * Disparar notificações de check-in
   */
  static async triggerCheckinNotifications(serviceOrderId: string, checkinData: CheckinData): Promise<void> {
    try {
      // Buscar dados da ordem de serviço
      const { data: orderData, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          users!service_orders_technician_id_fkey (
            id,
            name
          )
        `)
        .eq('id', serviceOrderId)
        .single();

      if (error || !orderData) {
        console.warn('⚠️ [CheckinService] Não foi possível buscar dados da ordem para notificações:', error);
        return;
      }

      // Mapear para ServiceOrder
      const serviceOrder: ServiceOrder = {
        id: orderData.id,
        orderNumber: orderData.order_number, // ✅ Mapear order_number do banco
        clientName: orderData.client_name,
        clientId: orderData.client_id,
        technicianId: orderData.technician_id,
        technicianName: orderData.users?.name || 'Técnico',
        equipmentType: orderData.equipment_type,
        equipmentModel: orderData.equipment_model,
        description: orderData.problem_description,
        status: orderData.status,
        serviceAttendanceType: orderData.service_attendance_type,
        scheduledDate: orderData.scheduled_date,
        clientAddress: orderData.address,
        workshopId: orderData.workshop_id,
        workshopName: orderData.workshop_name,
        totalAmount: parseFloat(orderData.order_value || '0')
      };

      // Disparar notificações
      await notificationTriggers.onTechnicianCheckedIn(
        serviceOrder,
        serviceOrder.technicianName,
        checkinData.checkin_address
      );

      console.log('✅ [CheckinService] Notificações de check-in disparadas');
    } catch (error) {
      console.error('❌ [CheckinService] Erro ao disparar notificações de check-in:', error);
    }
  }

  /**
   * Disparar notificações de check-out
   */
  static async triggerCheckoutNotifications(checkinData: CheckinData): Promise<void> {
    try {
      // Buscar dados da ordem de serviço
      const { data: orderData, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          users!service_orders_technician_id_fkey (
            id,
            name
          )
        `)
        .eq('id', checkinData.service_order_id)
        .single();

      if (error || !orderData) {
        console.warn('⚠️ [CheckinService] Não foi possível buscar dados da ordem para notificações:', error);
        return;
      }

      // Mapear para ServiceOrder
      const serviceOrder: ServiceOrder = {
        id: orderData.id,
        orderNumber: orderData.order_number, // ✅ Mapear order_number do banco
        clientName: orderData.client_name,
        clientId: orderData.client_id,
        technicianId: orderData.technician_id,
        technicianName: orderData.users?.name || 'Técnico',
        equipmentType: orderData.equipment_type,
        equipmentModel: orderData.equipment_model,
        description: orderData.problem_description,
        status: orderData.status,
        serviceAttendanceType: orderData.service_attendance_type,
        scheduledDate: orderData.scheduled_date,
        clientAddress: orderData.address,
        workshopId: orderData.workshop_id,
        workshopName: orderData.workshop_name,
        totalAmount: parseFloat(orderData.order_value || '0')
      };

      // Disparar notificações
      await notificationTriggers.onTechnicianCheckedOut(
        serviceOrder,
        serviceOrder.technicianName,
        checkinData.total_duration_minutes || 0,
        checkinData.checkout_address
      );

      console.log('✅ [CheckinService] Notificações de check-out disparadas');
    } catch (error) {
      console.error('❌ [CheckinService] Erro ao disparar notificações de check-out:', error);
    }
  }
}
