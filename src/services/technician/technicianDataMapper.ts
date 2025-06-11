
import { Technician } from '@/types';

/**
 * Mapeia os dados do técnico do formato do banco de dados (snake_case) para o formato do frontend (camelCase)
 * @param data Dados do técnico no formato do banco de dados
 * @returns Técnico no formato do frontend
 */
export const mapTechnicianData = (data: any): Technician => {
  const technician: Technician = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    specialties: data.specialties || null,
    location: data.location || null,
    isActive: data.is_active !== false, // Mapeia is_active para isActive (default: true)
  };

  return technician;
};
