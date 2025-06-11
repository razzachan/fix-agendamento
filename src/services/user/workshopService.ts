
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';

/**
 * Service responsável por operações relacionadas às oficinas
 */
export const workshopService = {
  /**
   * Busca todas as oficinas
   */
  async findAllWorkshops(): Promise<User[]> {
    try {
      // Primeiro tenta buscar na tabela profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'workshop')
        .order('name');
        
      if (!profilesError && profilesData && profilesData.length > 0) {
        console.log('Oficinas encontradas na tabela profiles:', profilesData.length);
        return profilesData.map(profile => ({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          avatar: profile.avatar || undefined,
          phone: profile.phone || undefined,
          address: profile.address || undefined,
          city: profile.city || undefined,
          state: profile.state || undefined,
          zip_code: profile.zip_code || undefined,
        }));
      }
      
      // Caso não encontre, busca na tabela users (compatibilidade com sistema existente)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'workshop')
        .order('name');
        
      if (usersError) {
        console.error('Erro ao buscar oficinas:', usersError);
        throw usersError;
      }
      
      console.log('Oficinas encontradas na tabela users:', usersData?.length || 0);
      return usersData?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || undefined,
        phone: user.phone || undefined,
        address: user.address || undefined,
        city: user.city || undefined,
        state: user.state || undefined,
        zip_code: user.zip_code || undefined,
      })) || [];
    } catch (error) {
      console.error('Erro ao buscar oficinas:', error);
      return [];
    }
  }
};
