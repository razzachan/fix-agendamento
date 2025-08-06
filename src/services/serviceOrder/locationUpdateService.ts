/**
 * Serviço para atualizar automaticamente o current_location
 * quando o status de uma ordem de serviço muda
 */

import { supabase } from '@/integrations/supabase/client';
import { calculateCurrentLocation, shouldUpdateLocation, CurrentLocation } from '@/utils/currentLocationUtils';

export const locationUpdateService = {
  /**
   * Atualiza o current_location baseado no novo status
   */
  async updateLocationOnStatusChange(
    serviceOrderId: string,
    oldStatus: string,
    newStatus: string,
    serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico'
  ): Promise<boolean> {
    try {
      console.log('🎯 [locationUpdateService] Verificando necessidade de atualizar location:', {
        serviceOrderId,
        oldStatus,
        newStatus,
        serviceAttendanceType
      });

      // Verificar se precisa atualizar
      if (!shouldUpdateLocation(oldStatus, newStatus, serviceAttendanceType)) {
        console.log('📍 [locationUpdateService] Location não precisa ser atualizado');
        return true;
      }

      // Calcular nova localização
      const newLocation = calculateCurrentLocation(newStatus, serviceAttendanceType);
      
      console.log('📍 [locationUpdateService] Atualizando location:', {
        serviceOrderId,
        newStatus,
        newLocation
      });

      // Atualizar no banco
      const { error } = await supabase
        .from('service_orders')
        .update({
          current_location: newLocation
        })
        .eq('id', serviceOrderId);

      if (error) {
        console.error('❌ [locationUpdateService] Erro ao atualizar location:', error);
        return false;
      }

      console.log('✅ [locationUpdateService] Location atualizado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ [locationUpdateService] Erro no updateLocationOnStatusChange:', error);
      return false;
    }
  },

  /**
   * Corrige o current_location de uma OS específica
   */
  async fixCurrentLocation(serviceOrderId: string): Promise<boolean> {
    try {
      console.log('🔧 [locationUpdateService] Corrigindo location da OS:', serviceOrderId);

      // Buscar dados atuais da OS
      const { data: order, error: fetchError } = await supabase
        .from('service_orders')
        .select('status, service_attendance_type, current_location')
        .eq('id', serviceOrderId)
        .single();

      if (fetchError || !order) {
        console.error('❌ [locationUpdateService] Erro ao buscar OS:', fetchError);
        return false;
      }

      // Calcular location correto
      const correctLocation = calculateCurrentLocation(
        order.status, 
        order.service_attendance_type as any
      );

      // Se já está correto, não fazer nada
      if (order.current_location === correctLocation) {
        console.log('✅ [locationUpdateService] Location já está correto');
        return true;
      }

      // Atualizar
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          current_location: correctLocation
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        console.error('❌ [locationUpdateService] Erro ao corrigir location:', updateError);
        return false;
      }

      console.log('✅ [locationUpdateService] Location corrigido:', {
        serviceOrderId,
        oldLocation: order.current_location,
        newLocation: correctLocation
      });

      return true;

    } catch (error) {
      console.error('❌ [locationUpdateService] Erro no fixCurrentLocation:', error);
      return false;
    }
  },

  /**
   * Corrige o current_location de todas as OSs com inconsistências
   */
  async fixAllInconsistentLocations(): Promise<number> {
    try {
      console.log('🔧 [locationUpdateService] Iniciando correção em massa...');

      // Buscar todas as OSs ativas
      const { data: orders, error: fetchError } = await supabase
        .from('service_orders')
        .select('id, status, service_attendance_type, current_location')
        .not('status', 'in', '(completed,cancelled)');

      if (fetchError || !orders) {
        console.error('❌ [locationUpdateService] Erro ao buscar OSs:', fetchError);
        return 0;
      }

      let correctedCount = 0;

      for (const order of orders) {
        const correctLocation = calculateCurrentLocation(
          order.status,
          order.service_attendance_type as any
        );

        if (order.current_location !== correctLocation) {
          const success = await this.fixCurrentLocation(order.id);
          if (success) {
            correctedCount++;
          }
        }
      }

      console.log(`✅ [locationUpdateService] Correção concluída: ${correctedCount} OSs corrigidas`);
      return correctedCount;

    } catch (error) {
      console.error('❌ [locationUpdateService] Erro na correção em massa:', error);
      return 0;
    }
  }
};
