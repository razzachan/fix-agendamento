import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientAuthService } from '@/services/client/clientAuthService';

export function useClientAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login: authLogin, logout: authLogout } = useAuth();

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validar se é um cliente
      const clientData = await clientAuthService.validateClient(email);
      
      if (!clientData) {
        throw new Error('Acesso negado. Esta conta não tem permissão de cliente.');
      }

      // Fazer login usando o contexto de auth existente
      await authLogin(email, password);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao fazer login. Verifique suas credenciais.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authLogout();
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer logout.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await clientAuthService.requestPasswordReset(email);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar redefinição de senha.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    login,
    logout,
    requestPasswordReset,
    isLoading,
    error
  };
}
