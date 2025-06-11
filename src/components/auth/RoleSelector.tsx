
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRole } from '@/types';

interface RoleSelectorProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ activeRole, onRoleChange }) => {
  return (
    <Tabs 
      defaultValue="admin" 
      value={activeRole}
      onValueChange={(value) => onRoleChange(value as UserRole)}
      className="mb-6"
    >
      <TabsList className="grid grid-cols-4 mb-2">
        <TabsTrigger value="admin">Administrador</TabsTrigger>
        <TabsTrigger value="technician">Técnico</TabsTrigger>
        <TabsTrigger value="client">Cliente</TabsTrigger>
        <TabsTrigger value="workshop">Oficina</TabsTrigger>
      </TabsList>
      <p className="text-xs text-muted-foreground text-center">
        Selecione o tipo de usuário para preencher as credenciais de demonstração
      </p>
    </Tabs>
  );
};
