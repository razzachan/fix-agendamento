/**
 * ⚠️ DEPRECATED: Serviço para consultas de agendamentos
 *
 * 🎯 NOVA ARQUITETURA: Use CalendarEventsService em vez deste serviço
 * Este arquivo será removido em versões futuras
 */

import { supabase } from '@/integrations/supabase/client';
import { ScheduledService } from '@/types';
import { toast } from 'sonner';
import { mapScheduledService } from './utils';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

console.warn('⚠️ [scheduledServiceQueryService] DEPRECATED: Use CalendarEventsService instead');

export const scheduledServiceQueryService = {
  async getAll(): Promise<ScheduledService[]> {
    try {
      // 🎯 NOVA ARQUITETURA: Buscar de calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      console.log('Todos os eventos do calendário:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Amostra de datas:', data.slice(0, 3).map(event => ({
          id: event.id,
          scheduledStartTime: event.start_time,
          normalizedDate: format(new Date(event.start_time), 'yyyy-MM-dd')
        })));
      }

      // Converter calendar_events para formato ScheduledService (compatibilidade)
      return data.map(event => ({
        id: event.id,
        serviceOrderId: event.service_order_id,
        technicianId: event.technician_id,
        technicianName: event.technician_name,
        clientId: event.client_id,
        clientName: event.client_name,
        scheduledStartTime: event.start_time,
        scheduledEndTime: event.end_time,
        address: event.address,
        description: event.description,
        status: event.status,
        finalCost: event.final_cost,
        clientPhone: event.client_phone,
        equipmentType: event.equipment_type
      }));
    } catch (error) {
      console.error('Erro ao buscar eventos do calendário:', error);
      toast.error('Erro ao carregar agendamentos.');
      return [];
    }
  },

  async getByTechnicianId(technicianId: string): Promise<ScheduledService[]> {
    try {
      console.log(`Buscando serviços para o técnico ID: ${technicianId}`);

      // Imprimir a consulta que estamos prestes a fazer para debugging
      console.log(`Executando consulta: SELECT * FROM calendar_events WHERE technician_id = '${technicianId}'`);

      // 🎯 NOVA ARQUITETURA: Buscar de calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('technician_id', technicianId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erro na consulta Supabase:', error);
        throw error;
      }

      if (!data) {
        console.log('Nenhum dado retornado da consulta');
        return [];
      }

      // Log detalhado dos resultados
      console.log(`Serviços encontrados para técnico ${technicianId}:`, data?.length || 0);
      if (data?.length === 0) {
        console.log('Nenhum serviço encontrado para o técnico');
      } else if (data) {
        console.log('Primeiros 2 serviços encontrados:', JSON.stringify(data.slice(0, 2)));


        console.log('Datas dos serviços:', data.map(service => {
          try {
            const date = new Date(service.scheduled_start_time);
            return {
              id: service.id,
              scheduledStartTime: service.scheduled_start_time,
              normalizedDate: isNaN(date.getTime()) ? 'Data inválida' : format(date, 'yyyy-MM-dd')
            };
          } catch (error) {
            return {
              id: service.id,
              scheduledStartTime: service.scheduled_start_time,
              normalizedDate: 'Erro na data'
            };
          }
        }));
      }
      
      // Converter calendar_events para formato ScheduledService (compatibilidade)
      return data ? data.map(event => {
        try {
          // Validar datas antes de mapear
          const startTime = event.start_time ? new Date(event.start_time) : null;
          const endTime = event.end_time ? new Date(event.end_time) : null;

          return {
            id: event.id,
            serviceOrderId: event.service_order_id,
            technicianId: event.technician_id,
            technicianName: event.technician_name,
            clientId: event.client_id,
            clientName: event.client_name,
            scheduledStartTime: startTime && !isNaN(startTime.getTime()) ? event.start_time : null,
            scheduledEndTime: endTime && !isNaN(endTime.getTime()) ? event.end_time : null,
            address: event.address,
            description: event.description,
            status: event.status,
            finalCost: event.final_cost,
            clientPhone: event.client_phone,
            equipmentType: event.equipment_type
          };
        } catch (error) {
          console.error('Erro ao mapear evento:', event.id, error);
          return null;
        }
      }).filter(Boolean) : [];
    } catch (error) {
      console.error(`Erro ao buscar serviços agendados para o técnico ${technicianId}:`, error);
      return [];
    }
  },

  async getByDateRange(startDate: Date, endDate: Date): Promise<ScheduledService[]> {
    try {
      // Convertendo para ISO string para o Supabase
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();
      
      console.log(`Buscando serviços no intervalo: ${startIso} até ${endIso}`);
      
      // 🎯 NOVA ARQUITETURA: Buscar de calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', startIso)
        .lte('start_time', endIso)
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`Encontrados ${data?.length || 0} eventos no intervalo de datas`);

      // Converter calendar_events para formato ScheduledService (compatibilidade)
      return data.map(event => ({
        id: event.id,
        serviceOrderId: event.service_order_id,
        technicianId: event.technician_id,
        technicianName: event.technician_name,
        clientId: event.client_id,
        clientName: event.client_name,
        scheduledStartTime: event.start_time,
        scheduledEndTime: event.end_time,
        address: event.address,
        description: event.description,
        status: event.status,
        finalCost: event.final_cost,
        clientPhone: event.client_phone,
        equipmentType: event.equipment_type
      }));
    } catch (error) {
      console.error('Erro ao buscar serviços agendados por intervalo de data:', error);
      return [];
    }
  },
  
  async getTechnicianSchedule(technicianId: string, date: Date): Promise<ScheduledService[]> {
    // Definir o início e fim do dia
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    console.log(`Buscando agenda do técnico ${technicianId} para ${format(date, 'yyyy-MM-dd')}`);
    console.log(`Intervalo: ${dayStart.toISOString()} até ${dayEnd.toISOString()}`);
    
    try {
      // 🎯 NOVA ARQUITETURA: Buscar de calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('technician_id', technicianId)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erro na consulta Supabase:', error);
        throw error;
      }

      console.log(`Serviços encontrados para a data ${format(date, 'yyyy-MM-dd')}: ${data?.length || 0}`);
      if (data?.length > 0) {
        console.log('Detalhes dos serviços encontrados:', JSON.stringify(data.slice(0, 2)));
      }
      // Converter calendar_events para formato ScheduledService (compatibilidade)
      return data.map(event => ({
        id: event.id,
        serviceOrderId: event.service_order_id,
        technicianId: event.technician_id,
        technicianName: event.technician_name,
        clientId: event.client_id,
        clientName: event.client_name,
        scheduledStartTime: event.start_time,
        scheduledEndTime: event.end_time,
        address: event.address,
        description: event.description,
        status: event.status,
        finalCost: event.final_cost,
        clientPhone: event.client_phone,
        equipmentType: event.equipment_type
      }));
    } catch (error) {
      console.error(`Erro ao buscar agenda do técnico ${technicianId} para a data ${date.toISOString()}:`, error);
      return [];
    }
  },
  
  async getByClientId(clientId: string): Promise<ScheduledService[]> {
    try {
      // 🎯 NOVA ARQUITETURA: Buscar de calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('client_id', clientId)
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      // Converter calendar_events para formato ScheduledService (compatibilidade)
      return data.map(event => ({
        id: event.id,
        serviceOrderId: event.service_order_id,
        technicianId: event.technician_id,
        technicianName: event.technician_name,
        clientId: event.client_id,
        clientName: event.client_name,
        scheduledStartTime: event.start_time,
        scheduledEndTime: event.end_time,
        address: event.address,
        description: event.description,
        status: event.status,
        finalCost: event.final_cost,
        clientPhone: event.client_phone,
        equipmentType: event.equipment_type
      }));
    } catch (error) {
      console.error(`Erro ao buscar eventos para o cliente ${clientId}:`, error);
      return [];
    }
  },

  async checkIfTechnicianHasAnyServices(technicianId: string): Promise<boolean> {
    try {
      console.log(`Verificando se o técnico ${technicianId} tem algum serviço agendado`);
      
      // 🎯 NOVA ARQUITETURA: Verificar em calendar_events (fonte única da verdade)
      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, description, start_time, client_name')
        .eq('technician_id', technicianId)
        .limit(10);

      if (error) {
        console.error('Erro na consulta Supabase:', error);
        throw error;
      }

      const hasServices = (data?.length || 0) > 0;
      console.log(`O técnico ${technicianId} ${hasServices ? 'tem' : 'não tem'} serviços agendados`);
      
      if (hasServices) {
        console.log('Serviços encontrados:', JSON.stringify(data));
        console.log('Datas dos eventos:', data.map(event => ({
          id: event.id,
          scheduledStartTime: event.start_time,
          normalizedDate: format(new Date(event.start_time), 'yyyy-MM-dd')
        })));
      }
      
      return hasServices;
    } catch (error) {
      console.error(`Erro ao verificar serviços para o técnico ${technicianId}:`, error);
      return false;
    }
  }
};
