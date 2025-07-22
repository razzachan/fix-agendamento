import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { format, isToday, isTomorrow, addMinutes, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarNotificationsProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

interface Notification {
  id: string;
  type: 'upcoming' | 'overdue' | 'reminder' | 'status_change';
  title: string;
  message: string;
  event?: CalendarEvent;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

const CalendarNotifications: React.FC<CalendarNotificationsProps> = ({
  events,
  onEventClick
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [shownToasts, setShownToasts] = useState<Set<string>>(new Set()); // ✅ Controle de toasts já exibidos
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ✅ Debounce para evitar spam

  // ✅ Função debounced para gerar notificações
  const generateNotifications = useCallback(() => {
      const now = new Date();
      const newNotifications: Notification[] = [];

      events.forEach(event => {
        const eventTime = event.startTime;
        const minutesUntilEvent = differenceInMinutes(eventTime, now);

        // Notificação de evento próximo (15 minutos antes) - ✅ Mais restritiva
        if (minutesUntilEvent > 0 && minutesUntilEvent <= 15 && minutesUntilEvent >= 10 && event.status === 'confirmed') {
          newNotifications.push({
            id: `upcoming-${event.id}`,
            type: 'upcoming',
            title: 'Agendamento em breve',
            message: `${event.clientName} em ${minutesUntilEvent} minutos`,
            event,
            timestamp: now,
            read: false,
            priority: 'high'
          });
        }

        // Notificação de evento atrasado
        if (minutesUntilEvent < 0 && Math.abs(minutesUntilEvent) <= 60 && event.status === 'confirmed') {
          newNotifications.push({
            id: `overdue-${event.id}`,
            type: 'overdue',
            title: 'Agendamento atrasado',
            message: `${event.clientName} - ${Math.abs(minutesUntilEvent)} min de atraso`,
            event,
            timestamp: now,
            read: false,
            priority: 'high'
          });
        }

        // Lembrete para eventos de hoje
        if (isToday(eventTime) && minutesUntilEvent > 60 && event.status === 'confirmed') {
          newNotifications.push({
            id: `reminder-today-${event.id}`,
            type: 'reminder',
            title: 'Agendamento hoje',
            message: `${event.clientName} às ${format(eventTime, 'HH:mm')}`,
            event,
            timestamp: now,
            read: false,
            priority: 'medium'
          });
        }

        // Lembrete para eventos de amanhã
        if (isTomorrow(eventTime) && event.status === 'confirmed') {
          newNotifications.push({
            id: `reminder-tomorrow-${event.id}`,
            type: 'reminder',
            title: 'Agendamento amanhã',
            message: `${event.clientName} às ${format(eventTime, 'HH:mm')}`,
            event,
            timestamp: now,
            read: false,
            priority: 'low'
          });
        }
      });

      // Remover duplicatas e manter apenas as mais recentes
      const uniqueNotifications = newNotifications.filter((notification, index, self) =>
        index === self.findIndex(n => n.id === notification.id)
      );

      setNotifications(prev => {
        const existingIds = prev.map(n => n.id);
        const newOnes = uniqueNotifications.filter(n => !existingIds.includes(n.id));
        return [...prev, ...newOnes].slice(-20); // Manter apenas as 20 mais recentes
      });
    }, [events]);

  // ✅ useEffect com debounce para evitar spam
  useEffect(() => {
    // Limpar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Executar com debounce de 2 segundos
    debounceTimeoutRef.current = setTimeout(() => {
      generateNotifications();
    }, 2000);

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [generateNotifications]);

  // ✅ Interval separado para atualizações periódicas
  useEffect(() => {
    // Atualizar notificações a cada 2 minutos (menos frequente)
    const interval = setInterval(generateNotifications, 120000);

    // ✅ Limpar toasts antigos a cada 5 minutos
    const cleanupInterval = setInterval(() => {
      setShownToasts(prev => {
        // Manter apenas toasts de notificações que ainda existem
        const currentNotificationIds = new Set(notifications.map(n => n.id));
        const filteredToasts = new Set([...prev].filter(id => currentNotificationIds.has(id)));
        return filteredToasts;
      });
    }, 300000); // 5 minutos

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [generateNotifications, notifications]);

  // Contar notificações não lidas
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  // Mostrar toast para notificações de alta prioridade (sem duplicatas)
  useEffect(() => {
    const highPriorityNotifications = notifications
      .filter(n => !n.read && n.priority === 'high' && !shownToasts.has(n.id));

    // ✅ Evitar spam - máximo 1 toast por vez
    if (highPriorityNotifications.length > 0) {
      const notification = highPriorityNotifications[0]; // Pegar apenas o primeiro

      // Marcar como exibido antes de mostrar o toast
      setShownToasts(prev => new Set([...prev, notification.id]));

      console.log(`🔔 Exibindo toast: ${notification.title} - ${notification.message}`);

      toast(notification.title, {
        description: notification.message,
        duration: 5000, // ✅ Duração específica
        action: notification.event ? {
          label: 'Ver',
          onClick: () => {
            onEventClick(notification.event!);
            markAsRead(notification.id);
          }
        } : undefined
      });
    }
  }, [notifications, onEventClick, shownToasts]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // ✅ Limpar toasts exibidos quando as notificações são lidas
  useEffect(() => {
    const readNotificationIds = notifications
      .filter(n => n.read)
      .map(n => n.id);

    if (readNotificationIds.length > 0) {
      setShownToasts(prev => {
        const newSet = new Set(prev);
        readNotificationIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  }, [notifications]);

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'upcoming': return Clock;
      case 'overdue': return AlertTriangle;
      case 'reminder': return Bell;
      case 'status_change': return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') {
      return 'border-l-red-500 bg-red-50';
    }
    switch (type) {
      case 'upcoming': return 'border-l-blue-500 bg-blue-50';
      case 'overdue': return 'border-l-red-500 bg-red-50';
      case 'reminder': return 'border-l-yellow-500 bg-yellow-50';
      case 'status_change': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive" className="text-xs">Alta</Badge>;
      case 'medium': return <Badge variant="default" className="text-xs">Média</Badge>;
      case 'low': return <Badge variant="secondary" className="text-xs">Baixa</Badge>;
      default: return null;
    }
  };

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </Button>

      {/* Painel de notificações */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-96 z-50"
          >
            <Card className="shadow-xl border-0">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificações
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Marcar todas como lidas
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      .map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        
                        return (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`
                              p-4 border-l-4 cursor-pointer transition-all duration-200 hover:bg-gray-50
                              ${getNotificationColor(notification.type, notification.priority)}
                              ${!notification.read ? 'font-medium' : 'opacity-75'}
                            `}
                            onClick={() => {
                              if (notification.event) {
                                onEventClick(notification.event);
                                setIsOpen(false);
                              }
                              markAsRead(notification.id);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span className="text-sm font-semibold">
                                  {notification.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getPriorityBadge(notification.priority)}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNotification(notification.id);
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {notification.message}
                            </p>

                            {notification.event && (
                              <div className="text-xs text-gray-500 space-y-1">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(notification.event.startTime, "dd/MM 'às' HH:mm", { locale: ptBR })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {notification.event.address}
                                </div>
                                {notification.event.technicianName && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {notification.event.technicianName}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="text-xs text-gray-400 mt-2">
                              {format(notification.timestamp, 'HH:mm')}
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay para fechar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default CalendarNotifications;
