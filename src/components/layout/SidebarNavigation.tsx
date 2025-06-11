
import React from 'react';
import { useLocation } from 'react-router-dom';
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
  CheckCircle
} from 'lucide-react';
import SidebarNavItem from './SidebarNavItem';
import { User } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';

interface SidebarNavigationProps {
  user: User;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ user }) => {
  const location = useLocation();
  const { isAdmin, isTechnician, isWorkshop, isClient } = usePermissions();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Itens comuns a todos os usuários
  const commonNavItems = [
    { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  ];

  // Itens específicos para administradores
  const adminNavItems = [
    { to: '/orders', icon: <FileText size={18} />, label: 'Ordens de Serviço' },
    { to: '/calendar', icon: <Calendar size={18} />, label: 'Calendário' },
    { to: '/main-calendar', icon: <Calendar size={18} />, label: 'Calendário Principal' },
    { to: '/schedules', icon: <Clock size={18} />, label: 'Pré-Agendamentos' },
    { to: '/clients', icon: <Users size={18} />, label: 'Clientes' },
    { to: '/technicians', icon: <Wrench size={18} />, label: 'Técnicos' },
    { to: '/workshops', icon: <Building size={18} />, label: 'Oficinas' },
    { to: '/tracking', icon: <MapPin size={18} />, label: 'Rastreamento' },
    { to: '/finance', icon: <DollarSign size={18} />, label: 'Financeiro' },
    { to: '/settings', icon: <Settings size={18} />, label: 'Configurações' }
  ];

  // Itens específicos para técnicos
  const technicianNavItems = [
    { to: '/technician', icon: <Package size={18} />, label: 'Minhas Ordens' },
    { to: '/calendar', icon: <Calendar size={18} />, label: 'Meu Calendário' }
  ];

  // Itens específicos para oficinas
  const workshopNavItems = [
    { to: '/orders', icon: <FileText size={18} />, label: 'Ordens na Oficina' },
    { to: '/calendar', icon: <Calendar size={18} />, label: 'Calendário' }
  ];

  // Itens específicos para clientes
  const clientNavItems = [
    { to: '/orders', icon: <FileText size={18} />, label: 'Meus Serviços' },
    { to: '/new-service', icon: <Plus size={18} />, label: 'Solicitar Serviço' }
  ];

  // Determinar quais itens mostrar com base na role do usuário
  let navItems = [...commonNavItems];

  if (isAdmin()) {
    navItems = [...navItems, ...adminNavItems];
  } else if (isTechnician()) {
    navItems = [...navItems, ...technicianNavItems];
  } else if (isWorkshop()) {
    navItems = [...navItems, ...workshopNavItems];
  } else if (isClient()) {
    navItems = [...navItems, ...clientNavItems];
  }

  return (
    <nav className="space-y-1">
      {navItems.map((item) => (
        <SidebarNavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          active={isActive(item.to)}
        />
      ))}
    </nav>
  );
};

export default SidebarNavigation;
