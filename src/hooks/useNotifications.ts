
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/types';
import { supabase } from '@/integrations/supabase/client';

export function useNotifications() {
  const { user } = useAuth();
  console.log('🔔 [useNotifications] Hook executado, user:', user);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchNotifications = async () => {
    if (!user?.id) {
      console.log('🔔 [useNotifications] Usuário sem ID:', user);
      return;
    }

    try {
      setLoading(true);
      console.log('🔔 [useNotifications] Buscando notificações para user.id:', user.id);
      const data = await notificationService.getAll(user.id);
      console.log('🔔 [useNotifications] Notificações retornadas:', data);
      setNotifications(data);
    } catch (error) {
      console.error('❌ [useNotifications] Erro ao buscar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const success = await notificationService.markAsRead(id);
    if (success) {
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    }
    return success;
  };

  const markAllAsRead = async () => {
    if (!user?.id) return false;

    const success = await notificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications(prevNotifications =>
        prevNotifications.map(notif => ({ ...notif, read: true }))
      );
    }
    return success;
  };

  const deleteAllNotifications = async () => {
    if (!user?.id) return false;

    const success = await notificationService.deleteAllNotifications(user.id);
    if (success) {
      setNotifications([]);
    }
    return success;
  };

  // Carrega notificações iniciais e configura inscrição para notificações em tempo real
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    fetchNotifications();

    // Inscreva-se para atualizações em tempo real
    const channel = notificationService.subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteAllNotifications,
    refresh: fetchNotifications
  };
}
