
import { useState, useEffect } from 'react';
import { User } from '@/types';
import { authService } from '@/services/user/authService';
import { supabase } from '@/integrations/supabase/client';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add isAuthenticated computed property
  const isAuthenticated = user !== null;

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Verificar se já existe um usuário na sessão
        console.log("🔍 [useAuthState] ===== VERIFICANDO SESSÃO EXISTENTE =====");
        const userData = await authService.getCurrentUser();
        console.log("🔍 [useAuthState] Resultado getCurrentUser:", userData);
        if (userData) {
          console.log("🔍 [useAuthState] Sessão encontrada para usuário:", {
            email: userData.email,
            role: userData.role,
            id: userData.id
          });
          setUser(userData);
        } else {
          console.log("🔍 [useAuthState] Nenhuma sessão ativa encontrada");
        }
      } catch (error) {
        console.error("🔍 [useAuthState] Falha ao verificar sessão:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();

    // Configurar listener para alterações de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Evento de autenticação detectado:", event);
        if (event === 'SIGNED_IN' && session?.user) {
          // Quando o usuário fizer login, atualizar o estado
          authService.getCurrentUser().then(userData => {
            if (userData) {
              console.log("Usuário logado com sucesso:", userData.email);
              setUser(userData);
            }
          });
        } else if (event === 'SIGNED_OUT') {
          // Quando o usuário fizer logout, limpar o estado
          console.log("Usuário deslogado");
          setUser(null);
        }
      }
    );

    // Listener para atualização de avatar
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { userId, avatarUrl } = event.detail;
      console.log('🔄 Avatar atualizado:', { userId, avatarUrl });

      // Atualizar o usuário atual se for o mesmo
      if (user && user.id === userId) {
        setUser(prev => prev ? { ...prev, avatar: avatarUrl } : null);
        console.log('✅ Avatar atualizado no contexto de auth');
      }
    };

    // Adicionar listener para evento customizado
    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);

    // Limpar os listeners ao desmontar
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
    };
  }, []);

  return {
    user,
    setUser,
    isLoading,
    setIsLoading,
    isAuthenticated
  };
}
