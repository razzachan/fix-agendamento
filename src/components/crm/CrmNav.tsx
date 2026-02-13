import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type CrmTab = 'dashboard' | 'leads' | 'kanban' | 'analytics';

export function CrmNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const active = useMemo<CrmTab>(() => {
    const p = location.pathname;
    if (p.startsWith('/crm/leads')) return 'leads';
    if (p.startsWith('/crm/kanban')) return 'kanban';
    if (p.startsWith('/crm/analytics')) return 'analytics';
    return 'dashboard';
  }, [location.pathname]);

  const onValueChange = (value: string) => {
    const v = value as CrmTab;
    switch (v) {
      case 'dashboard':
        navigate('/crm');
        break;
      case 'leads':
        navigate('/crm/leads');
        break;
      case 'kanban':
        navigate('/crm/kanban');
        break;
      case 'analytics':
        navigate('/crm/analytics');
        break;
      default:
        navigate('/crm');
    }
  };

  return (
    <Tabs value={active} onValueChange={onValueChange}>
      <TabsList className="w-full justify-start">
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
