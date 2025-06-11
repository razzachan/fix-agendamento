import { supabase } from '@/integrations/supabase/client';

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  specialties?: string[];
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

class TechnicianService {
  private technicians: Technician[] = [];

  constructor() {
    // Inicializar com alguns dados mock para fallback
    this.technicians = [
      {
        id: 'tech1',
        name: 'Carlos Silva',
        email: 'carlos.silva@eletrofix.com',
        phone: '(48) 99999-1111',
        status: 'active',
        specialties: ['Refrigeração', 'Máquinas de Lavar']
      },
      {
        id: 'tech2',
        name: 'Ana Oliveira',
        email: 'ana.oliveira@eletrofix.com',
        phone: '(48) 99999-2222',
        status: 'active',
        specialties: ['Microondas', 'Fogões']
      },
      {
        id: 'tech3',
        name: 'Roberto Santos',
        email: 'roberto.santos@eletrofix.com',
        phone: '(48) 99999-3333',
        status: 'active',
        specialties: ['Ar Condicionado', 'Geladeiras']
      }
    ];
  }

  // Obter todos os técnicos ativos
  async getActiveTechnicians(): Promise<Technician[]> {
    try {
      // Buscar dados reais do Supabase
      const { data, error } = await supabase
        .from('technicians')
        .select('*');

      if (error) {
        console.error('Erro ao buscar técnicos do Supabase:', error);
        // Fallback para dados mock em caso de erro
        return this.technicians.filter(t => t.status === 'active');
      }

      if (data && data.length > 0) {
        console.log(`Encontrados ${data.length} técnicos no Supabase`);

        // Mapear os dados do Supabase para o formato Technician
        // Assumindo que todos os técnicos estão ativos se não houver campo status
        return data.map(item => ({
          id: item.id || `tech-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name || item.nome || '',
          email: item.email || '',
          phone: item.phone || item.telefone || '',
          status: 'active', // Assumir que todos estão ativos
          specialties: item.specialties || item.especialidades || [],
          avatar_url: item.avatar_url,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
      } else {
        console.log('Nenhum técnico encontrado no Supabase, usando dados mock');
        return this.technicians.filter(t => t.status === 'active');
      }
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
      // Fallback para dados mock em caso de erro
      return this.technicians.filter(t => t.status === 'active');
    }
  }

  // Obter técnico por ID
  async getTechnicianById(id: string): Promise<Technician | undefined> {
    try {
      // Buscar do Supabase
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Erro ao buscar técnico ${id} do Supabase:`, error);
        // Fallback para dados mock em caso de erro
        return this.technicians.find(t => t.id === id);
      }

      if (data) {
        // Mapear os dados do Supabase para o formato Technician
        return {
          id: data.id,
          name: data.name || data.nome || '',
          email: data.email || '',
          phone: data.phone || data.telefone || '',
          status: 'active', // Assumir que todos estão ativos
          specialties: data.specialties || data.especialidades || [],
          avatar_url: data.avatar_url,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      } else {
        // Fallback para dados mock se não encontrar no Supabase
        return this.technicians.find(t => t.id === id);
      }
    } catch (error) {
      console.error(`Erro ao buscar técnico ${id}:`, error);
      // Fallback para dados mock em caso de erro
      return this.technicians.find(t => t.id === id);
    }
  }
}

export const technicianService = new TechnicianService();
