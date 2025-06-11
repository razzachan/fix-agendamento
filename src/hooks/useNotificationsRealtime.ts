import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { notificationEvents } from '@/utils/notificationEvents';

// Cliente para Realtime usando a mesma configuração do projeto principal
const realtimeClient = createClient(
  "https://hdyucwabemspehokoiks.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXVjd2FiZW1zcGVob2tvaWtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDA0MDc2OSwiZXhwIjoyMDU5NjE2NzY5fQ.G_2PF8hXeXIfl59xmywqpGdWiJC6JEVHFwJkoyBSWc0"
);

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  time: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
}

/**
 * Hook para gerenciar notificações em tempo real
 * Combina Supabase Realtime + Polling para máxima confiabilidade
 */
export function useNotificationsRealtime() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ total: 0, unread: 0, read: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs para controle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const lastFetchRef = useRef<number>(0);

  /**
   * Calcula estatísticas das notificações
   */
  const calculateStats = useCallback((notificationsList: Notification[]): NotificationStats => {
    const total = notificationsList.length;
    const unread = notificationsList.filter(n => !n.read).length;
    const read = total - unread;
    
    return { total, unread, read };
  }, []);

  /**
   * Busca notificações do banco de dados
   */
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (!user?.id) return;

    try {
      if (showLoading) setIsLoading(true);

      // Determinar userId correto baseado no tipo de usuário
      let userId = user.id;

      if (user.id === 'admin-demo-id') {
        // Buscar admin real do banco
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminError || !adminUser) {
          console.warn('⚠️ Admin demo não encontrou admin real, usando fallback');
          userId = '00000000-0000-0000-0000-000000000001';
        } else {
          userId = adminUser.id;
        }
      } else if (user.role === 'client' || user.id.includes('betoni-demo-id')) {
        // Para clientes, buscar o user_id correspondente na tabela users
        console.log('🔍 [NotificationsRealtime] Buscando user_id para cliente:', user.email, 'role:', user.role);
        const { data: clientUser, error: clientError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('role', 'client')
          .single();

        if (clientError || !clientUser) {
          console.warn('⚠️ Cliente não encontrou user_id correspondente, usando ID original:', user.id);
          console.warn('⚠️ Erro:', clientError);
          // Manter o ID original como fallback
        } else {
          userId = clientUser.id;
          console.log(`✅ Cliente mapeado: ${user.id} → ${userId}`);
        }
      }

      console.log('🎯 [NotificationsRealtime] UserId final para busca:', userId);

      console.log('🔍 [NotificationsRealtime] Executando query para user_id:', userId);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('time', { ascending: false })
        .limit(50); // Limitar para performance

      if (error) {
        console.error('❌ Erro ao buscar notificações:', error);
        console.error('❌ Detalhes do erro:', error);
        return;
      }

      console.log('🔍 [NotificationsRealtime] Query executada, data:', data);

      const notificationsList = data || [];
      setNotifications(notificationsList);
      setStats(calculateStats(notificationsList));
      lastFetchRef.current = Date.now();

      console.log(`✅ [NotificationsRealtime] ${notificationsList.length} notificações carregadas para userId: ${userId}`);
      console.log('📋 [NotificationsRealtime] Notificações encontradas:', notificationsList);
    } catch (error) {
      console.error('❌ Erro geral ao buscar notificações:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [user?.id, calculateStats]);

  /**
   * Configura Supabase Realtime
   */
  const setupRealtime = useCallback(async () => {
    if (!user?.id) return;

    console.log('🔄 [NotificationsRealtime] Configurando Supabase Realtime...');

    // Limpar canal anterior se existir
    if (realtimeChannelRef.current) {
      realtimeClient.removeChannel(realtimeChannelRef.current);
    }

    // Determinar userId correto baseado no tipo de usuário
    let userId = user.id;

    if (user.id === 'admin-demo-id') {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      userId = adminUser?.id || '00000000-0000-0000-0000-000000000001';
    } else if (user.role === 'client' || user.id.includes('betoni-demo-id')) {
      // Para clientes, buscar o user_id correspondente na tabela users
      const { data: clientUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .eq('role', 'client')
        .single();

      if (clientUser) {
        userId = clientUser.id;
        console.log(`✅ Cliente mapeado para realtime: ${user.id} → ${userId}`);
      }
    }

    // Criar novo canal usando o cliente realtime
    const channel = realtimeClient
      .channel('notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 [NotificationsRealtime] Mudança detectada:', payload);

          // Atualizar notificações imediatamente para melhor responsividade
          fetchNotifications(false);

          // Fazer uma segunda atualização após delay para garantir consistência
          setTimeout(() => {
            fetchNotifications(false);
          }, 500);
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 [NotificationsRealtime] Status: ${status}`);
        if (err) {
          console.error('❌ [NotificationsRealtime] Erro na conexão:', err);
        }

        const connected = status === 'SUBSCRIBED';
        console.log(`🔌 [NotificationsRealtime] Conectado: ${connected}`);
        setIsConnected(connected);

        if (connected) {
          console.log('✅ [NotificationsRealtime] Realtime conectado com sucesso!');
        } else {
          console.warn('⚠️ [NotificationsRealtime] Realtime não conectado, status:', status);
        }
      });

    realtimeChannelRef.current = channel;
  }, [user?.id, fetchNotifications]);

  /**
   * Configura polling como backup
   */
  const setupPolling = useCallback(() => {
    // Limpar polling anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Configurar novo polling mais frequente (a cada 5 segundos)
    pollingIntervalRef.current = setInterval(() => {
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;

      // Só fazer polling se não houve fetch recente (evitar duplicação com realtime)
      if (timeSinceLastFetch > 3000) { // 3 segundos
        console.log('🔄 [NotificationsRealtime] Polling backup executado');
        fetchNotifications(false);
      }
    }, 5000); // 5 segundos

    console.log('⏰ [NotificationsRealtime] Polling backup configurado (5s)');
  }, [fetchNotifications]);

  /**
   * Marca notificação como lida
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Erro ao marcar notificação como lida:', error);
        return false;
      }

      // Atualizar estado local imediatamente
      setNotifications(prev => {
        const updated = prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        );
        // Recalcular stats imediatamente
        setStats(calculateStats(updated));
        return updated;
      });

      console.log('✅ Notificação marcada como lida:', notificationId);
      return true;
    } catch (error) {
      console.error('❌ Erro geral ao marcar notificação como lida:', error);
      return false;
    }
  }, []);

  /**
   * Marca todas as notificações como lidas
   */
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Determinar userId correto baseado no tipo de usuário
      let userId = user.id;

      if (user.id === 'admin-demo-id') {
        // Buscar admin real do banco
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminError || !adminUser) {
          console.warn('⚠️ Admin demo não encontrou admin real, usando fallback');
          userId = '00000000-0000-0000-0000-000000000001';
        } else {
          userId = adminUser.id;
        }
      } else if (user.role === 'client' || user.id.includes('betoni-demo-id')) {
        // Para clientes, buscar o user_id correspondente na tabela users
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('role', 'client')
          .single();

        if (clientUser) {
          userId = clientUser.id;
        }
      }

      console.log('📖 [NotificationsRealtime] Marcando todas como lidas para userId:', userId);

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
        return false;
      }

      // Atualizar estado local
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        // Recalcular stats imediatamente
        setStats(calculateStats(updated));
        return updated;
      });

      console.log('✅ Todas as notificações marcadas como lidas');
      return true;
    } catch (error) {
      console.error('❌ Erro geral ao marcar todas as notificações como lidas:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Remove todas as notificações
   */
  const clearAll = useCallback(async () => {
    if (!user?.id) return false;

    try {
      // Determinar userId correto baseado no tipo de usuário
      let userId = user.id;

      if (user.id === 'admin-demo-id') {
        // Buscar admin real do banco
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminError || !adminUser) {
          console.warn('⚠️ Admin demo não encontrou admin real, usando fallback');
          userId = '00000000-0000-0000-0000-000000000001';
        } else {
          userId = adminUser.id;
        }
      } else if (user.role === 'client' || user.id.includes('betoni-demo-id')) {
        // Para clientes, buscar o user_id correspondente na tabela users
        const { data: clientUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .eq('role', 'client')
          .single();

        if (clientUser) {
          userId = clientUser.id;
        }
      }

      console.log('🗑️ [NotificationsRealtime] Removendo todas as notificações para userId:', userId);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Erro ao limpar notificações:', error);
        return false;
      }

      // Limpar estado local
      setNotifications([]);
      setStats({ total: 0, unread: 0, read: 0 });

      console.log('✅ Todas as notificações removidas com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro geral ao limpar notificações:', error);
      return false;
    }
  }, [user?.id]);

  /**
   * Força atualização manual
   */
  const refresh = useCallback(() => {
    console.log('🔄 [NotificationsRealtime] Atualização manual solicitada');
    fetchNotifications(true);
  }, [fetchNotifications]);

  /**
   * Força atualização imediata (para uso quando uma notificação é criada)
   */
  const forceUpdate = useCallback(() => {
    console.log('⚡ [NotificationsRealtime] Atualização forçada');
    fetchNotifications(false);
  }, [fetchNotifications]);

  // Efeito principal - Configurar tudo quando o usuário estiver disponível
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setStats({ total: 0, unread: 0, read: 0 });
      setIsLoading(false);
      return;
    }

    console.log('🚀 [NotificationsRealtime] Inicializando para usuário:', user.id, 'role:', user.role, 'email:', user.email);

    // 1. Buscar notificações iniciais
    fetchNotifications(true);

    // 2. Configurar realtime
    setupRealtime();

    // 3. Configurar polling backup
    setupPolling();

    // 4. Configurar listener de eventos globais
    const removeEventListener = notificationEvents.addListener(() => {
      console.log('📢 [NotificationsRealtime] Evento global recebido, atualizando...');
      fetchNotifications(false);
    });

    // Cleanup
    return () => {
      console.log('🧹 [NotificationsRealtime] Limpando recursos...');

      if (realtimeChannelRef.current) {
        realtimeClient.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Remover listener de eventos
      removeEventListener();
    };
  }, [user?.id, fetchNotifications, setupRealtime, setupPolling]);

  // Recalcular stats quando notifications mudam
  useEffect(() => {
    setStats(calculateStats(notifications));
  }, [notifications, calculateStats]);

  return {
    // Dados
    notifications,
    stats,
    isLoading,
    isConnected,

    // Ações
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh,
    forceUpdate
  };
}
