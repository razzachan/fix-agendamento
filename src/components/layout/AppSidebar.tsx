import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { SidebarMenuBadge, SidebarCategoryBadge } from '@/components/ui/sidebar-badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
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
  Plus,
  Route,
  CheckCircle,
  LogOut,
  User,
  ChevronRight,
  CreditCard,
  Truck,
  Wifi,
  WifiOff,
  BarChart3,
  Smartphone,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AppSidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isAdmin, isTechnician, isWorkshop, isClient } = usePermissions();
  const { open, isMobile } = useSidebar();

  // Hook para badges de notificação
  const { badges, isLoading: badgesLoading, isConnected, refreshBadges, lastUpdate } = useSidebarBadges();



  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
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

  // Estrutura hierárquica do menu para administradores
  const adminMenuStructure = [
    {
      category: 'Visão Geral',
      emoji: '📊',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', emoji: '📊' }
      ]
    },
    {
      category: 'Operações',
      emoji: '⚙️',
      items: [
        { to: '/orders', icon: FileText, label: 'Ordens de Serviço', emoji: '📋' },
        { to: '/quotes', icon: CreditCard, label: 'Orçamentos', emoji: '💳' },
        { to: '/repairs', icon: Wrench, label: 'Reparos & Entregas', emoji: '🔧' }
      ]
    },
    {
      category: 'Agendamento',
      emoji: '📅',
      items: [
        { to: '/main-calendar', icon: Calendar, label: 'Calendário', emoji: '📅' },
        { to: '/schedules', icon: Clock, label: 'Pré-Agendamentos', emoji: '⏰' }
      ]
    },
    {
      category: 'Gestão',
      emoji: '👥',
      items: [
        { to: '/clients', icon: Users, label: 'Clientes', emoji: '👥' },
        { to: '/technicians', icon: Wrench, label: 'Técnicos', emoji: '🔧' },
        { to: '/workshops', icon: Building, label: 'Oficinas', emoji: '🏭' }
      ]
    },
    {
      category: 'Monitoramento',
      emoji: '📍',
      items: [
        { to: '/tracking', icon: MapPin, label: 'Rastreamento', emoji: '📍' },
        { to: '/finance', icon: DollarSign, label: 'Financeiro', emoji: '💰' },
        { to: '/reports', icon: BarChart3, label: 'Relatórios Avançados', emoji: '📊' },
        { to: '/ai', icon: Brain, label: 'Inteligência Artificial', emoji: '🤖' }
      ]
    },
    {
      category: 'Sistema',
      emoji: '⚙️',
      items: [
        { to: '/settings', icon: Settings, label: 'Configurações', emoji: '⚙️' },
        { to: '/pwa-settings', icon: Smartphone, label: 'PWA & Mobile', emoji: '📱' }
      ]
    }
  ];

  // Estrutura hierárquica do menu para técnicos
  const technicianMenuStructure = [
    {
      category: 'Visão Geral',
      emoji: '📊',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', emoji: '📊' }
      ]
    },
    {
      category: 'Trabalho',
      emoji: '📦',
      items: [
        { to: '/technician', icon: Package, label: 'Minhas Ordens', emoji: '📦' },
        { to: '/calendar', icon: Calendar, label: 'Meu Calendário', emoji: '📅' }
      ]
    }
  ];

  // Estrutura hierárquica do menu para oficinas
  const workshopMenuStructure = [
    {
      category: 'Visão Geral',
      emoji: '📊',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', emoji: '📊' }
      ]
    },
    {
      category: 'Oficina',
      emoji: '🔧',
      items: [
        { to: '/orders', icon: FileText, label: 'Ordens na Oficina', emoji: '📋' },
        { to: '/calendar', icon: Calendar, label: 'Calendário', emoji: '📅' }
      ]
    }
  ];

  // Clientes não devem usar este sidebar - eles têm o ClientLayout
  const clientMenuStructure: any[] = [];

  // Determinar qual estrutura de menu usar com base na role do usuário
  let menuStructure = [];

  if (isAdmin()) {
    menuStructure = adminMenuStructure;
  } else if (isTechnician()) {
    menuStructure = technicianMenuStructure;
  } else if (isWorkshop()) {
    menuStructure = workshopMenuStructure;
  } else if (isClient()) {
    menuStructure = clientMenuStructure;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600/20 text-red-300 border-red-500/30';
      case 'technician':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'workshop':
        return 'bg-green-600/20 text-green-300 border-green-500/30';
      case 'client':
        return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-500/30';
    }
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
    <Sidebar collapsible="icon" className="bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 border-r border-[#e5b034]/30 shadow-2xl backdrop-blur-xl">
      <SidebarHeader className="relative overflow-hidden">
        {/* Premium golden gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#e5b034] via-[#d4a02a] to-[#c19020]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        {/* Header content */}
        <div className="relative flex items-center gap-3 px-6 py-6">
          {/* Premium logo container */}
          <div className="flex aspect-square size-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-2xl ring-1 ring-white/10">
            <div className="relative">
              <Wrench className="size-6 text-white drop-shadow-2xl" />
              <div className="absolute inset-0 bg-white/30 rounded-full blur-md -z-10" />
            </div>
          </div>

          {/* Premium brand typography */}
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-black text-xl text-white tracking-tight drop-shadow-2xl">
              Fix Fogões
            </span>
            {/* Premium connectivity indicator */}
            {(isMobile || open) && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/20 shadow-lg mt-2">
                {isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping absolute" />
                    </div>
                    <span className="text-xs font-semibold text-white">Online</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-ping absolute" />
                    </div>
                    <span className="text-xs font-semibold text-white">Offline</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Premium collapse indicator */}
          {!open && (
            <div className="absolute -right-3 top-1/2 transform -translate-y-1/2">
              <div className="bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white rounded-full p-2.5 shadow-2xl border border-white/20 backdrop-blur-sm ring-1 ring-white/10">
                <ChevronRight className="h-3 w-3 drop-shadow-lg" />
              </div>
            </div>
          )}
        </div>

        {/* Premium bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#e5b034]/50 via-[#e5b034] to-[#e5b034]/50" />
      </SidebarHeader>

      <SidebarContent className="px-0 py-6 space-y-3">
        {/* Premium user info section */}
        {user && (isMobile || open) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="mx-4 mb-8">
                {/* Elegant glassmorphism user card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/80 to-stone-900/90 backdrop-blur-xl border border-[#e5b034]/30 shadow-lg">
                  {/* Golden accent overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#e5b034]/10 via-transparent to-amber-800/10" />
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e5b034]/50 to-transparent" />

                  <div className="relative p-5">
                    {/* User info section */}
                    <div className="flex items-start gap-3 mb-4">
                      {/* Elegant avatar with golden ring */}
                      <div className="relative flex-shrink-0">
                        <div className="bg-gradient-to-br from-[#e5b034] to-[#d4a02a] rounded-full p-0.5 shadow-lg">
                          <div className="w-10 h-10 bg-amber-950 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-[#e5b034]" />
                          </div>
                        </div>
                        {/* Status indicator */}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-amber-950 shadow-lg">
                          <div className="w-full h-full bg-green-500 rounded-full animate-pulse" />
                        </div>
                      </div>

                      {/* User info text */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="text-sm font-bold text-white leading-tight mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                          {user.name || user.email}
                        </div>
                        <div className="text-xs text-amber-200 font-medium whitespace-nowrap">
                          Bem-vindo de volta
                        </div>
                      </div>
                    </div>

                    {/* Role badge and status */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl border-0 bg-[#e5b034]/20 text-[#e5b034] shadow-sm"
                      >
                        {getRoleLabel(user.role)}
                      </Badge>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/25">
                        <div className="w-2 h-2 bg-green-400 rounded-full shadow-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-ping absolute" />
                        </div>
                        <span className="text-xs font-semibold text-green-400">Ativo</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Premium navigation menu */}
        {menuStructure.map((section) => {
          const categoryBadgeCount = getCategoryBadgeCount(section.items);

          return (
            <SidebarGroup key={section.category}>
              <SidebarGroupLabel className={`text-amber-300 text-xs uppercase tracking-wider font-bold px-6 py-3 flex items-center justify-between ${isMobile ? 'data-[mobile=true]:!opacity-100 data-[mobile=true]:!mt-0' : ''}`}>
                <div className="flex items-center">
                  {(isMobile || open) ? (
                    <>
                      <span className="mr-3 text-lg filter drop-shadow-sm">{section.emoji}</span>
                      <span className="font-bold text-slate-300 tracking-wide">{section.category}</span>
                    </>
                  ) : (
                    <span className="text-xl filter drop-shadow-lg">{section.emoji}</span>
                  )}
                </div>
                {/* Premium category badge */}
                {(isMobile || open) && categoryBadgeCount > 0 && (
                  <div className="bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg ring-1 ring-[#e5b034]/30">
                    {categoryBadgeCount}
                  </div>
                )}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className={`${(isMobile || open) ? 'px-4' : 'px-2'} space-y-2`}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    const badgeCount = getBadgeCount(item.to);

                    return (
                      <SidebarMenuItem key={item.to} className="relative">
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className={`
                            flex items-center ${(isMobile || open) ? 'gap-4 px-4 justify-start' : 'px-0 justify-center'} py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                            ${active
                              ? 'bg-gradient-to-r from-[#e5b034]/25 to-[#d4a02a]/20 text-white shadow-md border-l-4 border-[#e5b034] backdrop-blur-sm'
                              : 'text-amber-100 hover:bg-amber-800/30 hover:text-white hover:shadow-sm border-l-4 border-transparent hover:border-[#e5b034]/40'
                            }
                            ${isMobile ? 'data-[mobile=true]:!size-auto data-[mobile=true]:!p-3' : ''}
                          `}
                        >
                          <a href={getItemUrl(item.to)} className={`flex items-center w-full h-full ${(isMobile || open) ? 'gap-4' : 'justify-center'} relative z-10`}>
                            {/* Sutil background glow for active items */}
                            {active && (
                              <div className="absolute inset-0 bg-gradient-to-r from-[#e5b034]/10 to-[#d4a02a]/10 rounded-xl blur-sm -z-10" />
                            )}

                            {(isMobile || open) ? (
                              <>
                                <span className="text-xl flex-shrink-0 filter drop-shadow-sm group-hover:scale-110 transition-transform duration-200">{item.emoji}</span>
                                <span className="font-semibold flex-1 tracking-wide">{item.label}</span>
                                {/* Premium badge when expanded */}
                                {badgeCount > 0 && (
                                  <div className={`
                                    px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ring-1 transition-all duration-200
                                    ${active
                                      ? 'bg-white/20 text-white ring-white/30'
                                      : 'bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white ring-[#e5b034]/30'
                                    }
                                  `}>
                                    {badgeCount}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <Icon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                                {/* Premium badge when collapsed */}
                                {badgeCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg ring-2 ring-slate-800">
                                    {badgeCount}
                                  </div>
                                )}
                              </>
                            )}
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-[#e5b034]/25 bg-gradient-to-t from-amber-900/60 to-stone-900/40 backdrop-blur-sm">
        {/* Premium status indicator */}
        {(isMobile || open) && (
          <div className="px-4 py-3 border-b border-[#e5b034]/10">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-[#e5b034]/10 border border-[#e5b034]/20">
                {isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full shadow-lg shadow-green-400/50">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-ping absolute" />
                    </div>
                    <span className="text-green-400 font-semibold">Online</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-ping absolute" />
                    </div>
                    <span className="text-red-400 font-semibold">Offline</span>
                  </>
                )}
              </div>
              {lastUpdate && (
                <div className="px-2 py-1 rounded-lg bg-[#e5b034]/10 border border-[#e5b034]/20">
                  <span className="text-[#e5b034] font-semibold" title={`Última atualização: ${lastUpdate.toLocaleTimeString()}`}>
                    {lastUpdate.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <SidebarMenu className={`${(isMobile || open) ? 'px-4' : 'px-2'} py-3`}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className={`
                  w-full h-full ${(isMobile || open) ? 'justify-start gap-3' : 'justify-center'}
                  text-amber-200 hover:text-white
                  hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-500/20
                  border border-slate-700/50 hover:border-red-500/50
                  rounded-xl transition-all duration-300 group
                  ${isMobile ? 'data-[mobile=true]:!size-auto data-[mobile=true]:!p-3' : ''}
                `}
                onClick={logout}
              >
                <LogOut className={`${(isMobile || open) ? 'h-4 w-4' : 'h-5 w-5'} group-hover:scale-110 transition-transform duration-200`} />
                {(isMobile || open) && <span className="font-semibold">Sair</span>}
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
