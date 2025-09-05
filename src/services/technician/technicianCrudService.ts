
import { supabase } from '@/integrations/supabase/client';
import { Technician } from '@/types';
import { mapTechnicianData } from './technicianDataMapper';

const API_BASE = (window as any).__API_URL__ || '';
const withToken = (headers: Record<string,string> = {})=>{
  const t = (window as any).BOT_TOKEN || (import.meta as any)?.env?.VITE_BOT_TOKEN || '';
  return t ? { ...headers, 'x-bot-token': t } : headers;
};

/**
 * Service dedicated to technician CRUD operations
 */
export const technicianCrudService = {
  /**
   * Creates a new technician
   */
  async createTechnician(technicianData: {
    name: string;
    email: string;
    phone?: string;
    specialties?: string[];
    userId?: string;
    isActive?: boolean;
    groups?: ('A'|'B'|'C')[];
    weight?: number;
  }): Promise<Technician | null> {
    try {
      // Prefer API (service role) to bypass RLS issues
      const r = await fetch(`${API_BASE}/api/technicians`, {
        method:'POST',
        headers: withToken({ 'Content-Type':'application/json' }),
        body: JSON.stringify({
          name: technicianData.name,
          email: technicianData.email,
          phone: technicianData.phone || null,
          specialties: technicianData.specialties || [],
          userId: technicianData.userId || null,
          isActive: technicianData.isActive !== false,
          groups: technicianData.groups || ['A','B'],
          weight: technicianData.weight ?? 0,
        })
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw j;
      return mapTechnicianData(j.technician);
    } catch (error) {
      console.error('Erro ao criar técnico:', error);
      throw error;
    }
  },

  /**
   * Updates an existing technician
   */
  async updateTechnician(technicianData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    specialties?: string[];
    isActive?: boolean;
    groups?: ('A'|'B'|'C')[];
    weight?: number;
  }): Promise<Technician | null> {
    try {
      // Prefer API (service role) to bypass RLS issues
      const r = await fetch(`${API_BASE}/api/technicians/${technicianData.id}`, {
        method:'PATCH',
        headers: withToken({ 'Content-Type':'application/json' }),
        body: JSON.stringify({
          name: technicianData.name,
          email: technicianData.email,
          phone: technicianData.phone || null,
          specialties: technicianData.specialties || [],
          isActive: technicianData.isActive,
          groups: technicianData.groups || undefined,
          weight: (typeof technicianData.weight === 'number' && !Number.isNaN(technicianData.weight)) ? technicianData.weight : undefined,
        })
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw j;
      return mapTechnicianData(j.technician);
    } catch (error) {
      console.error('Erro ao atualizar técnico:', error);
      throw error;
    }
  },

  /**
   * Deletes a technician by ID and its associated user if it exists
   */
  async deleteTechnician(id: string): Promise<boolean> {
    try {
      console.log(`Iniciando exclusão do técnico ${id}`);
      
      // First get the technician to check if there's an associated user
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar técnico para exclusão:', error);
        throw error;
      }

      if (data) {
        console.log(`Técnico encontrado, procedendo com a exclusão: ${data.name}`);
        
        // Delete the technician
        const { error: deleteError } = await supabase
          .from('technicians')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Erro ao excluir técnico do banco:', deleteError);
          throw deleteError;
        }

        console.log(`Técnico ${id} excluído com sucesso do banco de dados`);

        // If there's an associated user, delete it
        if (data.user_id) {
          try {
            console.log(`Excluindo usuário associado ${data.user_id}`);
            const { userService } = await import('@/services');
            await userService.deleteUser(data.user_id);
            console.log(`Usuário ${data.user_id} excluído com sucesso`);
          } catch (userError) {
            console.error('Erro ao excluir usuário associado ao técnico:', userError);
          }
        }

        return true;
      } else {
        console.log(`Técnico ${id} não encontrado no banco`);
      }

      return false;
    } catch (error) {
      console.error('Erro ao excluir técnico:', error);
      throw error;
    }
  }
};
