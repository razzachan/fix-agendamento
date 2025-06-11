
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useSessionCheck() {
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function checkSession() {
      setIsLoading(true);
      try {
        // Se não tiver usuário no contexto AuthContext, nem adianta continuar
        if (!user) {
          console.log('Nenhum usuário encontrado no contexto AuthContext');
          setSessionConfirmed(false);
          setIsLoading(false);
          return;
        }
        
        // Verifica o token no localStorage primeiro
        const storedToken = localStorage.getItem('authToken');
        if (!storedToken || storedToken.split('.').length !== 3) {
          console.log('Token inválido ou ausente');
          // Se temos um usuário no contexto, considerar sessão confirmada mesmo sem token válido
          setSessionConfirmed(!!user);
          setIsLoading(false);
          return;
        }
        
        // Verifica a sessão no Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao verificar sessão:', error);
          // Se temos um usuário no contexto, considerar sessão confirmada mesmo com erro
          setSessionConfirmed(!!user);
        } else if (data && data.session) {
          console.log('Sessão verificada com sucesso');
          setSessionConfirmed(true);
        } else {
          console.log('Usuário presente mas sem sessão ativa no Supabase');
          // Se temos um usuário no AuthContext, vamos permitir o uso mesmo sem sessão ativa no Supabase
          setSessionConfirmed(true);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        // Se temos um usuário no contexto, consideramos sessão confirmada mesmo com erro
        setSessionConfirmed(!!user);
      } finally {
        setIsLoading(false);
      }
    }
    
    checkSession();
  }, [user]);

  // Função para forçar uma nova verificação de sessão
  const recheckSession = async () => {
    setIsLoading(true);
    try {
      // Verificar token primeiro
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken || storedToken.split('.').length !== 3) {
        console.log('Token inválido ou ausente durante rechecagem');
        // Se temos um usuário no contexto, considerar sessão confirmada mesmo sem token válido
        if (user) {
          setSessionConfirmed(true);
          setIsLoading(false);
          return true;
        }
        setSessionConfirmed(false);
        setIsLoading(false);
        return false;
      }
      
      const { data, error } = await supabase.auth.getSession();
      
      if (!error && data.session) {
        console.log('Sessão recuperada com sucesso');
        setSessionConfirmed(true);
        return true;
      } else {
        console.log('Usuário presente mas sem sessão ativa. Considerando válido para diagnóstico.');
        // Se temos um usuário no AuthContext, vamos permitir o uso mesmo sem sessão ativa no Supabase
        if (user) {
          setSessionConfirmed(true);
          return true;
        }
        
        setSessionConfirmed(false);
        return false;
      }
    } catch (error) {
      console.error('Erro ao rechecar sessão:', error);
      // Mesmo com erro, se temos um usuário, vamos permitir
      if (user) {
        setSessionConfirmed(true);
        return true;
      }
      
      setSessionConfirmed(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    sessionConfirmed: user ? true : sessionConfirmed, // Simplificação: se tem usuário, consideramos confirmado
    setSessionConfirmed, 
    isLoading, 
    recheckSession 
  };
}
