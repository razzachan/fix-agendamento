import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para acessar o usuário atual
 * 
 * Este hook é um wrapper em torno do useAuth que fornece apenas
 * as informações do usuário, sem as funções de autenticação.
 */
export function useUser() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return {
    user,
    isLoading,
    isAuthenticated
  };
}
