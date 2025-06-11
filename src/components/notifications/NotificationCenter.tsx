import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Trash2,
  MarkAsRead,
  Filter,
  RefreshCw,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Notification } from '@/hooks/useNotificationsRealtime';

interface NotificationCenterProps {
  className?: string;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { user } = useAuth();
  const {
    notifications,
    stats,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh
  } = useNotificationsRealtime();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    // Filtro por status de leitura
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;
    
    // Filtro por tipo
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    
    return true;
  });

  // Agrupar notificações por data
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.time || '').toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const getNotificationIcon = (type: string | null) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationBadge = (type: string | null) => {
    switch (type) {
      case 'success':
        return <Badge variant="outline" className="text-green-600 border-green-200">Sucesso</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Aviso</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-200">Erro</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Info</Badge>;
    }
  };

  const formatRelativeTime = (time: string | null) => {
    if (!time) return 'Agora';
    try {
      return formatDistanceToNow(new Date(time), { 
        addSuffix: true, 
        locale: ptBR 
      });
    } catch {
      return 'Data inválida';
    }
  };

  const unreadCount = stats.unread;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Central de Notificações</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
            {/* Indicador de conexão em tempo real */}
            <div className="flex items-center gap-1 ml-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" title="Conectado em tempo real" />
              ) : (
                <WifiOff className="h-4 w-4 text-yellow-500" title="Modo offline - usando polling" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
            >
              <MarkAsRead className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAll()}
              disabled={stats.total === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar todas
            </Button>
          </div>
        </div>
        <CardDescription>
          Acompanhe todas as atualizações e eventos do sistema em tempo real
          {isConnected && (
            <span className="text-green-600 ml-2">• Conectado</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="all" 
              onClick={() => setFilter('all')}
              className="flex items-center gap-2"
            >
              Todas
              <Badge variant="outline" className="text-xs">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="unread" 
              onClick={() => setFilter('unread')}
              className="flex items-center gap-2"
            >
              Não lidas
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="read" 
              onClick={() => setFilter('read')}
              className="flex items-center gap-2"
            >
              Lidas
              <Badge variant="outline" className="text-xs">
                {stats.read}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Filtros por tipo */}
          <div className="flex items-center gap-2 mt-4 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
              >
                Todos
              </Button>
              <Button
                variant={typeFilter === 'info' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('info')}
              >
                <Info className="h-3 w-3 mr-1" />
                Info
              </Button>
              <Button
                variant={typeFilter === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('success')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Sucesso
              </Button>
              <Button
                variant={typeFilter === 'warning' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('warning')}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Aviso
              </Button>
              <Button
                variant={typeFilter === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('error')}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Erro
              </Button>
            </div>
          </div>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[500px] w-full">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Carregando notificações...
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {filter === 'unread' 
                      ? 'Nenhuma notificação não lida' 
                      : filter === 'read'
                      ? 'Nenhuma notificação lida'
                      : 'Nenhuma notificação encontrada'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedNotifications).map(([date, dayNotifications]) => (
                    <div key={date}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background">
                        {new Date(date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </h4>
                      <div className="space-y-2">
                        {dayNotifications.map((notification) => (
                          <Card 
                            key={notification.id} 
                            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                              !notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                            }`}
                            onClick={() => !notification.read && markAsRead(notification.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  {getNotificationIcon(notification.type)}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h5 className={`text-sm font-medium ${
                                        !notification.read ? 'font-semibold' : ''
                                      }`}>
                                        {notification.title}
                                      </h5>
                                      {getNotificationBadge(notification.type)}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {notification.description}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      {formatRelativeTime(notification.time)}
                                    </p>
                                  </div>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
