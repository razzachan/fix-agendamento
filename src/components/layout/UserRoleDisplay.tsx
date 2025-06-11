
import React from 'react';
import { User } from '@/types';

interface UserRoleDisplayProps {
  user: User | null;
}

const UserRoleDisplay: React.FC<UserRoleDisplayProps> = ({ user }) => {
  if (!user) return null;

  const roleLabels = {
    admin: 'Administrador',
    technician: 'Técnico',
    client: 'Cliente',
    workshop: 'Oficina'
  };

  return (
    <div className="px-3 py-2 mb-6 bg-sidebar-accent rounded-md">
      <p className="text-xs font-medium text-sidebar-accent-foreground/70">
        Logado como
      </p>
      <p className="text-sm font-medium text-sidebar-accent-foreground">
        {roleLabels[user.role]}
      </p>
    </div>
  );
};

export default UserRoleDisplay;
