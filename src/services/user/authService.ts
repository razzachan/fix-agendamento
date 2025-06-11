
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { supabaseAuthService } from './auth';

/**
 * Service responsible for authentication-related operations
 */
export const authService = {
  /**
   * Autentica um usuário com email e senha
   */
  async login(email: string, password: string): Promise<User | null> {
    return await supabaseAuthService.login(email, password);
  },
  
  /**
   * Registra um novo usuário
   */
  async register(email: string, password: string, name: string): Promise<{ user: User | null; error: any }> {
    return await supabaseAuthService.register(email, password, name);
  },
  
  /**
   * Busca o usuário atual baseado na sessão
   */
  async getCurrentUser(): Promise<User | null> {
    return await supabaseAuthService.getCurrentUser();
  },
  
  /**
   * Faz o logout do usuário
   */
  async logout(): Promise<boolean> {
    return await supabaseAuthService.logout();
  }
};
