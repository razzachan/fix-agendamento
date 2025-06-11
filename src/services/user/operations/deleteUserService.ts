
import { supabase } from '@/integrations/supabase/client';

/**
 * Service responsible for user deletion operations
 */
export const deleteUserService = {
  /**
   * Deletes a user by their ID
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      console.log(`Iniciando exclusão do usuário: ${userId}`);
      
      // Primeira verificação - garantir que o ID do usuário é válido
      if (!userId || userId === 'admin-id' || userId === 'workshop-id') {
        console.error('Tentativa de excluir usuário do sistema de demonstração');
        return false;
      }

      // Delete the user from the users table
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error(`Erro ao excluir usuário ${userId}:`, error);
        return false;
      }

      console.log(`Usuário ${userId} excluído com sucesso`);
      return true;
    } catch (error) {
      console.error(`Exceção ao excluir usuário ${userId}:`, error);
      return false;
    }
  }
};
