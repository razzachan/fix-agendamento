
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Bell, Loader2, Menu, X, Wifi, WifiOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import NotificationItem from '@/components/notifications/NotificationItem';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { open, toggleSidebar } = useSidebar();

  // Sistema de notificações em tempo real
  const {
    notifications,
    stats,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearAll
  } = useNotificationsRealtime();

  // Handlers para ações de notificação
  const handleMarkAllAsRead = async () => {
    const success = await markAllAsRead();
    if (success) {
      toast({
        title: "Notificações",
        description: "Todas as notificações foram marcadas como lidas",
      });
    }
  };

  const handleClearAll = async () => {
    const success = await clearAll();
    if (success) {
      toast({
        title: "Notificações",
        description: "Todas as notificações foram removidas",
      });
    }
  };



  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const roleLabels = {
    admin: 'Administrador',
    technician: 'Técnico',
    client: 'Cliente'
  };



  return (
    <header className="bg-white shadow-sm border-b border-gray-200 py-2 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Botão de toggle do sidebar customizado */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSidebar}
            className="relative group hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm"
            title={open ? "Ocultar menu lateral" : "Mostrar menu lateral"}
          >
            <div className="relative">
              <Menu className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
              {/* Indicador visual sutil */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </div>
          </Button>
          <h1 className="text-xl font-semibold text-gray-700">Fix Fogões</h1>
        </div>
        <div className="flex items-center gap-4">
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
            <DropdownMenuContent className="w-[420px]" align="end">
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
                  <div className="text-xs text-gray-500">
                    {stats.total > 0 && `${stats.unread} não lidas de ${stats.total}`}
                  </div>
                </div>
                {stats.total > 0 && (
                  <div className="flex gap-2 w-full">
                    {stats.unread > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                        onClick={handleMarkAllAsRead}
                      >
                        Marcar todas como lidas
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                      onClick={handleClearAll}
                    >
                      Limpar todas
                    </Button>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

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
                            {new Date(notification.time).toLocaleString('pt-BR')}
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

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-4">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabels[user.role]}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => logout()}>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
