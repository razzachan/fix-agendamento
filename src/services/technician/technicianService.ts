
import { Technician } from '@/types';
import { technicianQueryService } from './technicianQueryService';
import { technicianCrudService } from './technicianCrudService';
import { createTechnicianWithUser } from './technicianUserService';
import { supabase } from '@/integrations/supabase/client';

/**
 * Main technician service that brings together various technician-related operations
 */
export const technicianService = {
  // Query operations
  getAll: technicianQueryService.getAll,
  getById: technicianQueryService.getById,
  getByUserId: technicianQueryService.getByUserId,
  
  // CRUD operations
  createTechnician: technicianCrudService.createTechnician,
  updateTechnician: technicianCrudService.updateTechnician,
  deleteTechnician: technicianCrudService.deleteTechnician,
  
  // User-related operations
  createTechnicianWithUser,
  
  // Location-related operations
  updateLocation: async (technicianId: string, location: { lat: number; lng: number }) => {
    try {
      const { error } = await supabase
        .from('technicians')
        .update({ location })
        .eq('id', technicianId);
        
      return { error };
    } catch (error) {
      console.error('Erro ao atualizar localização do técnico:', error);
      return { error };
    }
  }
};
