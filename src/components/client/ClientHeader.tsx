import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Smartphone,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Home,
  Package,
  MessageCircle,
  Loader2,
  Wifi,
  WifiOff,
  CheckCheck,
  Trash2,
  Settings,
  Camera,
  Lock,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useClientAuth } from '@/hooks/client/useClientAuth';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { formatRelativeTime } from '@/utils/dateUtils';

export function ClientHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const { logout } = useClientAuth();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate('/client/login');
  };

  // Handlers para ações de notificação
  const handleMarkAllAsRead = async () => {
    console.log('🔄 Marcando todas as notificações como lidas...');
    const success = await markAllAsRead();
    if (success) {
      console.log('✅ Todas as notificações marcadas como lidas');
    } else {
      console.error('❌ Erro ao marcar notificações como lidas');
    }
  };

  const handleClearAll = async () => {
    console.log('🔄 Removendo todas as notificações...');
    const success = await clearAll();
    if (success) {
      console.log('✅ Todas as notificações removidas');
    } else {
      console.error('❌ Erro ao remover notificações');
    }
  };

  const menuItems = [
    { icon: Home, label: 'Início', path: '/client/portal' },
    { icon: Package, label: 'Meus Equipamentos', path: '/client/orders' },
    { icon: MessageCircle, label: 'Suporte', href: 'https://api.whatsapp.com/send?phone=5548988332664' }
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center">
              <img
                src="/fix fogoes.png"
                alt="Fix Fogões"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fix Fogões</h1>
              <p className="text-xs text-gray-500">Portal do Cliente</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.href) {
                    window.open(item.href, '_blank');
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                className="flex items-center space-x-2 text-gray-600 hover:text-green-600 transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <div className="relative">
                    <Bell className="h-5 w-5 text-gray-600" />
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

                  {/* Botões de ação */}
                  {notifications.length > 0 && (
                    <div className="flex items-center gap-2">
                      {stats.unread > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMarkAllAsRead}
                          className="h-7 text-xs"
                        >
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Marcar todas como lidas
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
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
                            <p className="text-xs text-gray-500 mt-1">
                              {formatRelativeTime(notification.time)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
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

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden md:flex items-center space-x-3 h-auto p-2 hover:bg-gray-50">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name || 'Cliente'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full overflow-hidden">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {user?.name || 'Cliente'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate('/client/profile')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Editar Perfil
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/client/profile/photo')}>
                  <Camera className="h-4 w-4 mr-2" />
                  Alterar Foto
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/client/profile/password')}>
                  <Lock className="h-4 w-4 mr-2" />
                  Alterar Senha
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>



            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="space-y-3">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.href) {
                      window.open(item.href, '_blank');
                    } else if (item.path) {
                      navigate(item.path);
                    }
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 w-full text-left px-3 py-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              
              {/* Mobile User Info */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center space-x-3 px-3 py-2">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full overflow-hidden">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user?.name || 'Cliente'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
