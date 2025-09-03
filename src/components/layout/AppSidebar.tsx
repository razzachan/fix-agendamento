import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Settings,
  Wrench,
  Package,
  Building,
  Clock,
  LogOut,
  User,
  ChevronLeft,
  CreditCard,
  BarChart3,
  Smartphone,
  Brain,
  Search,
  Menu,
  Moon,
  Sun,
  Bot,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AppSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { isAdmin, isTechnician, isWorkshop, isClient } = usePermissions();

  // Hook para badges de notificação
  const { badges, isLoading: badgesLoading, isConnected, refreshBadges, lastUpdate } = useSidebarBadges();
  const wa = useWhatsAppStatus(5000);

  // Estados do novo sidebar
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');


  // Efeito para carregar estado do sidebar
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed === 'true' && window.innerWidth > 768) {
      setIsCollapsed(true);
    }
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem('sidebar-collapsed', (!isCollapsed).toString());
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSearchClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Mapear badges para rotas específicas
  const getBadgeCount = (path: string): number => {
    if (badgesLoading) return 0;

    let count = 0;
    switch (path) {
      case '/orders':
        count = badges.orders;
        break;
      case '/schedules':
        count = badges.schedules;
        break;
      case '/clients':
        count = badges.clients;
        break;
      case '/technicians':
        count = badges.technicians;
        break;
      case '/finance':
        count = badges.finance;
        break;
      case '/quotes':
        count = badges.quotes;
        break;
      case '/repairs':
      case '/deliveries':
        // Somar badges de reparos e entregas para o item unificado
        count = (badges.repairs || 0) + (badges.deliveries || 0);
        break;
      case '/workshops':
        count = badges.workshops;
        break;
      case '/tracking':
        count = badges.sla_violations; // Mostrar violações de SLA no rastreamento
        break;
      case '/technician':
        count = badges.orders; // Para técnicos, mostrar suas ordens
        break;
      case '/calendar':
        count = badges.schedules; // Para calendário, mostrar agendamentos
        break;
      default:
        count = 0;
    }


    return count;
  };

  // Mapear filtros de badge para cada rota
  const getBadgeFilterParam = (path: string): string => {
    switch (path) {
      case '/orders':
        return 'urgent';
      case '/repairs':
      case '/deliveries':
        // Para o item unificado, usar 'attention' como filtro padrão
        return 'attention';
      case '/finance':
        return 'problems';
      case '/workshops':
        return 'bottlenecks';
      case '/tracking':
        return 'sla_violations';
      default:
        return '';
    }
  };

  // Gerar URL com filtro de badge quando há badge ativo
  const getItemUrl = (path: string): string => {
    const badgeCount = getBadgeCount(path);
    if (badgeCount > 0) {
      const filterParam = getBadgeFilterParam(path);
      if (filterParam) {
        return `${path}?badge_filter=${filterParam}`;
      }
    }
    return path;
  };

  // Calcular total de badges por categoria
  const getCategoryBadgeCount = (categoryItems: any[]): number => {
    return categoryItems.reduce((total, item) => total + getBadgeCount(item.to), 0);
  };

  // Menu items para administradores
  const adminMenuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: FileText, label: 'Ordens de Serviço' },
    { to: '/quotes', icon: CreditCard, label: 'Orçamentos' },
    { to: '/repairs', icon: Wrench, label: 'Reparos & Entregas' },
    { to: '/calendar', icon: Calendar, label: 'Calendário' }, // ✅ CORREÇÃO: Usar /calendar em vez de /main-calendar
    { to: '/schedules', icon: Clock, label: 'Pré-Agendamentos' },
    { to: '/clients', icon: Users, label: 'Clientes' },
    { to: '/technicians', icon: Wrench, label: 'Técnicos' },
    { to: '/workshops', icon: Building, label: 'Oficinas' },
    { to: '/tracking', icon: MapPin, label: 'Rastreamento' },
    { to: '/finance', icon: DollarSign, label: 'Financeiro' },
    { to: '/reports', icon: BarChart3, label: 'Relatórios' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/ai', icon: Brain, label: 'IA' },
    { to: '/bot', icon: Bot, label: 'Assistente IA' },
    { to: '/admin/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
    { to: '/settings', icon: Settings, label: 'Configurações' },
    { to: '/pwa-settings', icon: Smartphone, label: 'PWA & Mobile' }
  ];

  // Menu items para técnicos
  const technicianMenuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/technician', icon: Package, label: 'Minhas Ordens' },
    { to: '/calendar', icon: Calendar, label: 'Meu Calendário' }
  ];

  // Menu items para oficinas
  const workshopMenuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/orders', icon: FileText, label: 'Ordens na Oficina' },
    { to: '/calendar', icon: Calendar, label: 'Calendário' }
  ];

  // Determinar qual menu usar com base na role do usuário
  let menuItems: any[] = [];

  if (isAdmin()) {
    menuItems = adminMenuItems;
  } else if (isTechnician()) {
    menuItems = technicianMenuItems;
  } else if (isWorkshop()) {
    menuItems = workshopMenuItems;
  }

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

  // Filtrar itens do menu baseado na busca
  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile navbar */}
      <nav className="site-nav md:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      </nav>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        sidebar ${isCollapsed ? 'collapsed' : ''} border-r border-gray-200 dark:border-gray-700
      `}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#e5b034] to-[#d4a02a] rounded-full flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg text-gray-900 dark:text-white">Fix Fogões</span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className={`h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="sidebar-content flex-1 p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
          {/* Search Form */}
          <div
            className={`search-form flex items-center gap-3 p-3 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg transition-all cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 ${isCollapsed ? 'justify-center' : ''}`}
            onClick={handleSearchClick}
          >
            <Search className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            {!isCollapsed && (
              <input
                type="search"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            )}
          </div>

          {/* User Info */}
          {user && !isCollapsed && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#e5b034] to-[#d4a02a] rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {user.name || user.email}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {getRoleLabel(user.role)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${wa.connected ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  WhatsApp {wa.connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          )}

          {/* Menu List */}
          <ul className="menu-list space-y-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              const badgeCount = getBadgeCount(item.to);

              return (
                <li key={item.to} className="menu-item">
                  <button
                    onClick={() => handleNavigation(getItemUrl(item.to))}
                    className={`
                      menu-link w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group
                      ${active
                        ? 'bg-[#e5b034] text-white shadow-md'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                    `}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    {!isCollapsed && (
                      <>
                        <span className="menu-label font-medium flex-1 text-left">{item.label}</span>
                        {badgeCount > 0 && (
                          <Badge className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${active
                              ? 'bg-white/20 text-white'
                              : 'bg-[#e5b034] text-white'
                            }
                          `}>
                            {badgeCount}
                          </Badge>
                        )}
                      </>
                    )}
                    {isCollapsed && badgeCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-[#e5b034] text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                        {badgeCount}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer border-t border-gray-200 dark:border-gray-700 p-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`
              theme-toggle w-full flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <div className="theme-label flex items-center gap-2">
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              )}
              {!isCollapsed && (
                <span className="theme-text text-sm font-medium text-gray-700 dark:text-gray-300">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className="theme-toggle-track ml-auto w-12 h-6 bg-gray-300 dark:bg-[#e5b034] rounded-full relative transition-colors">
                <div className={`
                  theme-toggle-indicator absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200
                  ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
              </div>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className={`
              w-full flex items-center gap-3 p-3 mt-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AppSidebar;
