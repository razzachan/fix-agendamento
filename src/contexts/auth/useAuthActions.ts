
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '@/types';
import { authService } from '@/services/user/authService';
import { supabaseAuthService } from '@/services/user/supabaseAuthService';
import { toast } from 'sonner';

export function useAuthActions(
  setUser: React.Dispatch<React.SetStateAction<User | null>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  const navigate = useNavigate();

  const signIn = async (credentials: any) => {
    console.log("Tentando login para:", credentials.email);
    setIsLoading(true);
    try {
      const userData = await authService.login(credentials.email, credentials.password);

      console.log('🔍 [useAuthActions] Dados retornados do login:', userData);

      if (userData) {
        console.log('🔍 [useAuthActions] Definindo usuário no estado:', {
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

        setUser(userData);
        toast.success('Login realizado com sucesso!');

        console.log('🚀 [Auth] Redirecionando usuário:', {
          name: userData.name,
          email: userData.email,
          role: userData.role
        });

        // Redirecionar baseado na role do usuário
        if (userData.role === 'client') {
          console.log('🚀 [Auth] Redirecionando para portal do cliente');
          navigate('/client/portal');
        } else if (userData.role === 'workshop') {
          console.log('🚀 [Auth] Redirecionando para dashboard de oficina');
          navigate('/dashboard');
        } else {
          console.log('🚀 [Auth] Redirecionando para dashboard');
          navigate('/dashboard');
        }
      } else {
        console.error("Login falhou - dados de usuário não retornados");
        toast.error('Credenciais inválidas.');
        
        // Checar se é uma conta especial que não está implementada corretamente
        if (['betonipaulo@gmail.com', 'joaooficina@gmail.com'].includes(credentials.email)) {
          console.log("Essa é uma conta especial que deveria ter login facilitado");
        }
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error('Falha ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: { 
    email: string; 
    password: string; 
    name: string;
    role?: UserRole;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  }) => {
    setIsLoading(true);
    try {
      const result = await supabaseAuthService.register(
        data.email, 
        data.password, 
        data.name, 
        data.role || 'client',
        {
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zip_code
        }
      );
      
      if (result.user) {
        setUser(result.user);
        toast.success('Registro realizado com sucesso!');

        // Redirecionar baseado na role do usuário
        if (result.user.role === 'client') {
          navigate('/client/portal');
        } else {
          navigate('/dashboard');
        }
      }
      
      return result;
    } catch (error: any) {
      console.error("Erro no registro:", error);
      toast.error('Falha ao registrar: ' + (error?.message || 'Erro desconhecido'));
      return { user: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      toast.success('Logout realizado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error('Erro ao realizar o logout.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!updates.id) return;
    setIsLoading(true);
    try {
      const updatedUser = await supabaseAuthService.updateProfile(updates.id, updates);
      if (updatedUser) {
        setUser(updatedUser);
        toast.success('Perfil atualizado com sucesso!');
      } else {
        toast.error('Falha ao atualizar o perfil.');
      }
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error('Erro ao atualizar o perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
        console.log('✅ Dados do usuário recarregados');
      }
    } catch (error) {
      console.error('❌ Erro ao recarregar dados do usuário:', error);
    }
  };

  // Add logout as an alias for signOut for compatibility
  const logout = signOut;

  return {
    signIn,
    signUp,
    signOut,
    updateUser,
    refreshUser,
    logout
  };
}
