import { supabase } from '@/integrations/supabase/client';
import { parseISO, format, isSameDay } from 'date-fns';
import { DEFAULT_CALENDAR_CONFIG, TechnicianAvailability, AvailabilitySlot } from '@/types/calendar';
import { calendarService } from './CalendarService';

/**
 * Serviço para verificar disponibilidade no calendário principal
 */
class CalendarAvailabilityService {
  /**
   * Verifica disponibilidade de um técnico em uma data específica
   * Versão simplificada para evitar erros
   */
  async checkTechnicianAvailability(
    technicianId: string,
    date: string
  ): Promise<TechnicianAvailability> {
    try {
      console.log(`🔍 Verificando disponibilidade do técnico ${technicianId} em ${date}`);

      // DEBUG: Buscar todas as ordens de João Santos para verificar se existem
      const { data: allJoaoOrders, error: debugError } = await supabase
        .from('service_orders')
        .select('id, client_name, scheduled_date, scheduled_time, technician_id, status')
        .ilike('client_name', '%joão santos%');

      if (!debugError && allJoaoOrders) {
        console.log(`🔍 DEBUG: Todas as ordens de João Santos no banco:`, allJoaoOrders);
      }

      // Buscar ordens de serviço agendadas para este técnico nesta data
      console.log(`🔍 Buscando ordens de serviço para técnico ${technicianId} na data ${date}`);
      console.log(`🔍 Parâmetros da busca: technician_id="${technicianId}", scheduled_date="${date}"`);

      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select('id, client_name, scheduled_date, technician_id, status')
        .eq('technician_id', technicianId)
        .gte('scheduled_date', `${date}T00:00:00`)
        .lt('scheduled_date', `${date}T23:59:59`)
        .not('scheduled_date', 'is', null);

      // DEBUG: Buscar também sem filtro de técnico para ver se há ordens na data
      const { data: allOrdersOnDate, error: debugError2 } = await supabase
        .from('service_orders')
        .select('id, client_name, scheduled_date, technician_id, status')
        .gte('scheduled_date', `${date}T00:00:00`)
        .lt('scheduled_date', `${date}T23:59:59`)
        .not('scheduled_date', 'is', null);

      if (!debugError2 && allOrdersOnDate) {
        console.log(`🔍 DEBUG: Todas as ordens na data ${date}:`, allOrdersOnDate);
      }

      if (error) {
        console.error('❌ Erro ao buscar ordens de serviço:', error);
      } else {
        console.log(`📊 Ordens encontradas: ${serviceOrders?.length || 0}`);
        if (serviceOrders && serviceOrders.length > 0) {
          console.log('📋 Detalhes das ordens:', serviceOrders);
        }
      }

      const occupiedHours = new Set<number>();

      // Processar ordens de serviço existentes
      if (serviceOrders) {
        console.log(`🔄 Processando ${serviceOrders.length} ordens de serviço...`);
        serviceOrders.forEach(order => {
          console.log(`📋 Processando ordem: ${order.client_name} - scheduled_date: "${order.scheduled_date}" (tipo: ${typeof order.scheduled_date})`);
          if (order.scheduled_date) {
            // Extrair hora do scheduled_date (formato ISO datetime)
            let hour;
            const dateTimeStr = order.scheduled_date.toString();

            try {
              // Extrair hora diretamente da string ISO para evitar problemas de timezone
              const isoMatch = dateTimeStr.match(/T(\d{2}):(\d{2}):(\d{2})/);
              if (isoMatch) {
                hour = parseInt(isoMatch[1]);
                console.log(`🕐 Hora extraída diretamente da string ISO: ${hour} de "${dateTimeStr}"`);
              } else {
                // Fallback para Date se não conseguir extrair da string
                const date = new Date(dateTimeStr);
                hour = date.getHours();
                console.log(`🕐 Hora extraída via Date: ${hour} de "${dateTimeStr}"`);
              }

              if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                occupiedHours.add(hour);
                console.log(`📅 Slot ocupado encontrado: ${hour}:00 (Cliente: ${order.client_name}, OS: ${order.id}, data original: "${order.scheduled_date}")`);
              } else {
                console.warn(`⚠️ Hora inválida extraída: ${hour} da data "${order.scheduled_date}" para ordem ${order.id}`);
              }
            } catch (error) {
              console.warn(`⚠️ Erro ao processar data: "${order.scheduled_date}" para ordem ${order.id}:`, error);
            }
          }
        });
      } else {
        console.log('⚠️ Nenhuma ordem de serviço encontrada para esta data/técnico');
      }

      const slots: AvailabilitySlot[] = [];

      // Gerar slots para cada hora do dia de trabalho
      for (let hour = DEFAULT_CALENDAR_CONFIG.workStartHour; hour < DEFAULT_CALENDAR_CONFIG.workEndHour; hour++) {
        const slot: AvailabilitySlot = {
          hour,
          isAvailable: true
        };

        // Verificar se é horário de almoço
        if (hour >= DEFAULT_CALENDAR_CONFIG.lunchStartHour &&
            hour < DEFAULT_CALENDAR_CONFIG.lunchEndHour) {
          slot.isAvailable = false;
          slot.reason = 'Horário de almoço';
        }
        // Verificar se há ordem de serviço agendada neste horário
        else if (occupiedHours.has(hour)) {
          slot.isAvailable = false;
          slot.reason = 'Agendamento confirmado';
        }

        slots.push(slot);
      }

      const totalAvailable = slots.filter(slot => slot.isAvailable).length;
      const totalOccupied = slots.filter(slot => !slot.isAvailable).length;

      console.log(`✅ Disponibilidade verificada: ${totalAvailable} slots livres, ${totalOccupied} ocupados`);

      return {
        date,
        technicianId,
        slots,
        totalAvailable,
        totalOccupied,
        serviceOrders: serviceOrders || []
      };

    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      // Retornar um resultado padrão em caso de erro
      const slots: AvailabilitySlot[] = [];
      for (let hour = DEFAULT_CALENDAR_CONFIG.workStartHour; hour < DEFAULT_CALENDAR_CONFIG.workEndHour; hour++) {
        slots.push({
          hour,
          isAvailable: hour < DEFAULT_CALENDAR_CONFIG.lunchStartHour || hour >= DEFAULT_CALENDAR_CONFIG.lunchEndHour,
          reason: hour >= DEFAULT_CALENDAR_CONFIG.lunchStartHour && hour < DEFAULT_CALENDAR_CONFIG.lunchEndHour ? 'Horário de almoço' : undefined
        });
      }

      return {
        date,
        technicianId,
        slots,
        totalAvailable: slots.filter(slot => slot.isAvailable).length,
        totalOccupied: slots.filter(slot => !slot.isAvailable).length
      };
    }
  }

  /**
   * Verifica se um horário específico está disponível
   * Versão simplificada para evitar erros
   */
  async isTimeSlotAvailable(
    technicianId: string,
    date: string,
    hour: number
  ): Promise<{ isAvailable: boolean; reason?: string }> {
    try {
      // Verificar se está dentro do horário de trabalho
      if (hour < DEFAULT_CALENDAR_CONFIG.workStartHour ||
          hour >= DEFAULT_CALENDAR_CONFIG.workEndHour) {
        return {
          isAvailable: false,
          reason: `Fora do horário de trabalho (${DEFAULT_CALENDAR_CONFIG.workStartHour}h-${DEFAULT_CALENDAR_CONFIG.workEndHour}h)`
        };
      }

      // Verificar se é horário de almoço
      if (hour >= DEFAULT_CALENDAR_CONFIG.lunchStartHour &&
          hour < DEFAULT_CALENDAR_CONFIG.lunchEndHour) {
        return {
          isAvailable: false,
          reason: 'Horário de almoço'
        };
      }

      // Verificar se há ordem de serviço agendada neste horário
      const { data: serviceOrders, error } = await supabase
        .from('service_orders')
        .select('id')
        .eq('technician_id', technicianId)
        .eq('scheduled_date', date)
        .like('scheduled_time', `${hour.toString().padStart(2, '0')}:%`)
        .limit(1);

      if (error) {
        console.error('Erro ao verificar slot específico:', error);
        return { isAvailable: true }; // Em caso de erro, assumir disponível
      }

      if (serviceOrders && serviceOrders.length > 0) {
        return {
          isAvailable: false,
          reason: 'Agendamento confirmado'
        };
      }

      return { isAvailable: true };

    } catch (error) {
      console.error('Erro ao verificar slot específico:', error);
      return {
        isAvailable: false,
        reason: 'Erro na verificação'
      };
    }
  }

  /**
   * Encontra próximos slots disponíveis
   */
  async findNextAvailableSlots(
    technicianId: string,
    date: string,
    count: number = 5
  ): Promise<AvailabilitySlot[]> {
    try {
      const availability = await this.checkTechnicianAvailability(technicianId, date);
      return availability.slots
        .filter(slot => slot.isAvailable)
        .slice(0, count);
    } catch (error) {
      console.error('Erro ao buscar slots disponíveis:', error);
      return [];
    }
  }

  /**
   * Valida múltiplos horários de uma vez
   */
  async validateMultipleTimeSlots(
    technicianId: string,
    date: string,
    requestedHours: number[]
  ): Promise<{ 
    isValid: boolean; 
    conflicts: string[]; 
    availableSlots: number[];
    conflictingSlots: number[];
  }> {
    try {
      const conflicts: string[] = [];
      const availableSlots: number[] = [];
      const conflictingSlots: number[] = [];

      for (const hour of requestedHours) {
        const check = await this.isTimeSlotAvailable(technicianId, date, hour);
        
        if (check.isAvailable) {
          availableSlots.push(hour);
        } else {
          conflictingSlots.push(hour);
          conflicts.push(`${hour}:00 - ${check.reason}`);
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts,
        availableSlots,
        conflictingSlots
      };

    } catch (error) {
      console.error('Erro na validação múltipla:', error);
      return {
        isValid: false,
        conflicts: ['Erro interno na validação'],
        availableSlots: [],
        conflictingSlots: requestedHours
      };
    }
  }

  /**
   * Sugere horários alternativos em caso de conflito
   */
  async suggestAlternativeSlots(
    technicianId: string,
    date: string,
    conflictingHours: number[],
    count: number = 3
  ): Promise<number[]> {
    try {
      const availability = await this.checkTechnicianAvailability(technicianId, date);
      
      return availability.slots
        .filter(slot => 
          slot.isAvailable && 
          !conflictingHours.includes(slot.hour)
        )
        .map(slot => slot.hour)
        .slice(0, count);

    } catch (error) {
      console.error('Erro ao sugerir horários alternativos:', error);
      return [];
    }
  }
}

export const calendarAvailabilityService = new CalendarAvailabilityService();
