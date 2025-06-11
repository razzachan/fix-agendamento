import { supabase } from '@/integrations/supabase/client';

export const clientAuthService = {
  /**
   * Valida se o email pertence a um cliente válido
   */
  async validateClient(email: string) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone, cpf_cnpj')
        .eq('email', email)
        .single();

      if (error) {
        console.log('Cliente não encontrado:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao validar cliente:', error);
      return null;
    }
  },

  /**
   * Busca dados do cliente por ID
   */
  async getClientById(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      throw new Error('Erro ao carregar dados do cliente.');
    }
  },

  /**
   * Solicita redefinição de senha
   */
  async requestPasswordReset(email: string) {
    try {
      // Primeiro verifica se é um cliente válido
      const client = await this.validateClient(email);
      
      if (!client) {
        throw new Error('Email não encontrado em nossa base de clientes.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/client/reset-password`
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      throw new Error(error.message || 'Erro ao solicitar redefinição de senha.');
    }
  },

  /**
   * Atualiza senha do cliente
   */
  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      throw new Error(error.message || 'Erro ao atualizar senha.');
    }
  },

  /**
   * Busca cliente por email para login
   */
  async getClientByEmail(email: string) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          phone,
          cpf_cnpj,
          address,
          created_at
        `)
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Cliente não encontrado
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar cliente por email:', error);
      throw new Error('Erro ao verificar dados do cliente.');
    }
  }
};
