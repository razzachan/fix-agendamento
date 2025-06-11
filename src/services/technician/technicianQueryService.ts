
import { supabase } from '@/integrations/supabase/client';
import { Technician } from '@/types';
import { toast } from 'sonner';
import { mapTechnicianData } from './technicianDataMapper';

/**
 * Service dedicated to querying technicians
 */
export const technicianQueryService = {
  /**
   * Gets all technicians from the database
   */
  async getAll(cacheParam?: string): Promise<Technician[]> {
    try {
      console.log('Buscando todos os técnicos do Supabase...');
      
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('name')
        .abortSignal(AbortSignal.timeout(10000));

      if (error) {
        console.error('Erro ao buscar técnicos:', error);
        throw error;
      }

      console.log('Técnicos encontrados no banco:', data.length);

      // Retornar todos os técnicos encontrados
      console.log('Retornando todos os técnicos encontrados:', data.length);
      return data.map(mapTechnicianData);
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
      toast.error('Erro ao carregar dados de técnicos.');
      return [];
    }
  },

  /**
   * Gets a technician by ID
   */
  async getById(id: string): Promise<Technician | null> {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data ? mapTechnicianData(data) : null;
    } catch (error) {
      console.error(`Erro ao buscar técnico por ID ${id}:`, error);
      return null;
    }
  },

  /**
   * Gets a technician by user ID
   */
  async getByUserId(userId: string): Promise<Technician | null> {
    try {
      console.log(`Fetching technician with userId: ${userId}`);
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          console.log(`No technician found with userId: ${userId}`);
          return null;
        }
        throw error;
      }

      console.log(`Found technician:`, data);
      return data ? mapTechnicianData(data) : null;
    } catch (error) {
      console.error(`Erro ao buscar técnico por userId ${userId}:`, error);
      return null;
    }
  }
};
