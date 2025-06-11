import { supabase } from '@/integrations/supabase/client';
import { ScheduledService } from '@/types';
import { toast } from 'sonner';
import { mapScheduledService } from './utils';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

export const scheduledServiceQueryService = {
  async getAll(): Promise<ScheduledService[]> {
    try {
      const { data, error } = await supabase.from('scheduled_services').select('*');

      if (error) {
        throw error;
      }

      console.log('Todos os serviços agendados:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Amostra de datas:', data.slice(0, 3).map(service => ({
          id: service.id,
          scheduledStartTime: service.scheduled_start_time,
          normalizedDate: format(new Date(service.scheduled_start_time), 'yyyy-MM-dd')
        })));
      }
      return data.map(mapScheduledService);
    } catch (error) {
      console.error('Erro ao buscar serviços agendados:', error);
      toast.error('Erro ao carregar serviços agendados.');
      return [];
    }
  },

  async getByTechnicianId(technicianId: string): Promise<ScheduledService[]> {
    try {
      console.log(`Buscando serviços para o técnico ID: ${technicianId}`);
      
      // Imprimir a consulta que estamos prestes a fazer para debugging
      console.log(`Executando consulta: SELECT * FROM scheduled_services WHERE technician_id = '${technicianId}'`);
      
      const { data, error } = await supabase
        .from('scheduled_services')
        .select('*')
        .eq('technician_id', technicianId);

      if (error) {
        console.error('Erro na consulta Supabase:', error);
        throw error;
      }

      // Log detalhado dos resultados
      console.log(`Serviços encontrados para técnico ${technicianId}:`, data?.length || 0);
      if (data?.length === 0) {
        console.log('Nenhum serviço encontrado para o técnico');
      } else if (data) {
        console.log('Primeiros 2 serviços encontrados:', JSON.stringify(data.slice(0, 2)));
        console.log('Datas dos serviços:', data.map(service => ({
          id: service.id,
          scheduledStartTime: service.scheduled_start_time,
          normalizedDate: format(new Date(service.scheduled_start_time), 'yyyy-MM-dd')
        })));
      }
      
      return data ? data.map(mapScheduledService) : [];
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
      
      const { data, error } = await supabase
        .from('scheduled_services')
        .select('*')
        .gte('scheduled_start_time', startIso)
        .lte('scheduled_start_time', endIso);

      if (error) {
        throw error;
      }

      console.log(`Encontrados ${data?.length || 0} serviços no intervalo de datas`);
      return data.map(mapScheduledService);
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
      const { data, error } = await supabase
        .from('scheduled_services')
        .select('*')
        .eq('technician_id', technicianId)
        .gte('scheduled_start_time', dayStart.toISOString())
        .lte('scheduled_start_time', dayEnd.toISOString());

      if (error) {
        console.error('Erro na consulta Supabase:', error);
        throw error;
      }

      console.log(`Serviços encontrados para a data ${format(date, 'yyyy-MM-dd')}: ${data?.length || 0}`);
      if (data?.length > 0) {
        console.log('Detalhes dos serviços encontrados:', JSON.stringify(data.slice(0, 2)));
      }
      return data.map(mapScheduledService);
    } catch (error) {
      console.error(`Erro ao buscar agenda do técnico ${technicianId} para a data ${date.toISOString()}:`, error);
      return [];
    }
  },
  
  async getByClientId(clientId: string): Promise<ScheduledService[]> {
    try {
      const { data, error } = await supabase
        .from('scheduled_services')
        .select('*')
        .eq('client_id', clientId);

      if (error) {
        throw error;
      }

      return data.map(mapScheduledService);
    } catch (error) {
      console.error(`Erro ao buscar serviços agendados para o cliente ${clientId}:`, error);
      return [];
    }
  },

  async checkIfTechnicianHasAnyServices(technicianId: string): Promise<boolean> {
    try {
      console.log(`Verificando se o técnico ${technicianId} tem algum serviço agendado`);
      
      // Vamos usar uma consulta mais simples sem contagem para debugging
      const { data, error } = await supabase
        .from('scheduled_services')
        .select('id, description, scheduled_start_time, client_name')
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
        console.log('Datas dos serviços:', data.map(service => ({
          id: service.id,
          scheduledStartTime: service.scheduled_start_time,
          normalizedDate: format(new Date(service.scheduled_start_time), 'yyyy-MM-dd')
        })));
      }
      
      return hasServices;
    } catch (error) {
      console.error(`Erro ao verificar serviços para o técnico ${technicianId}:`, error);
      return false;
    }
  }
};
