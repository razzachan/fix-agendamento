
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, User, LogOut, Wifi, WifiOff, Loader2, CheckCheck, Trash2, RefreshCw } from 'lucide-react';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { formatRelativeTime } from '@/utils/dateUtils';

const Header: React.FC = () => {
  const { user, logout } = useAuth();

  // Hook de notificações em tempo real
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'technician':
        return 'Técnico';
      case 'workshop':
        return 'Oficina';
      case 'client':
        return 'Cliente';
      default:
        return 'Usuário';
    }
  };



  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 py-3 px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-700 dark:text-white">Fix Fogões</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <div className="relative">
                  <Bell className="h-5 w-5" />
                  {/* Indicador de conexão em tempo real */}
                  {isConnected && (
                    <Wifi className="absolute -top-1 -left-1 h-3 w-3 text-green-500" />
                  )}
                  {!isConnected && (
                    <WifiOff className="absolute -top-1 -left-1 h-3 w-3 text-yellow-500" />
                  )}
                </div>
                {stats.unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white animate-pulse">
                    {stats.unread}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[420px]">
              <DropdownMenuLabel className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Notificações</span>
                    {isConnected ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">• Tempo Real</span>
                    ) : (
                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">• Offline</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {stats.unread > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {stats.unread} não lida{stats.unread > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    disabled={isLoading}
                    className="h-6 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                  {stats.unread > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      className="h-6 text-xs"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Marcar todas como lidas
                    </Button>
                  )}
                  {stats.total > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="h-6 text-xs"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </DropdownMenuLabel>

              {isLoading ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-gray-500">Carregando...</span>
                </div>
              ) : notifications.length > 0 ? (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 break-words">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 break-words whitespace-pre-wrap">
                            {notification.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(notification.time)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-4 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <Bell className="h-12 w-12 text-gray-300" />
                      {isConnected && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-600">Não há notificações</div>
                      {isConnected ? (
                        <div className="text-xs text-green-600 mt-1">Sistema conectado em tempo real</div>
                      ) : (
                        <div className="text-xs text-yellow-600 mt-1">Modo offline ativo</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#e5b034] text-white">
                    {user?.name ? getInitials(user.name) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                {user?.name && (
                  <span className="hidden md:inline-block text-sm font-medium">
                    {user.name}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{user?.name || user?.email}</p>
                  <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role || '')}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
