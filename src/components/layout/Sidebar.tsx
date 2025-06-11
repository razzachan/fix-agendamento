
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SidebarNavigation from './SidebarNavigation';
import UserRoleDisplay from './UserRoleDisplay';
import SidebarFooter from './SidebarFooter';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4">
        <div className="flex items-center justify-center mb-6">
          <h1 className="text-lg font-semibold text-white">EletroFix Hub</h1>
        </div>
        
        {user && <UserRoleDisplay user={user} />}

        {user && <SidebarNavigation user={user} />}
      </div>
      
      <SidebarFooter onLogout={logout} />
    </aside>
  );
};

export default Sidebar;
