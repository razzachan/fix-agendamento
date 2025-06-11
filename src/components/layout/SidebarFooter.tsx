
import React from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarFooterProps {
  onLogout: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ onLogout }) => {
  return (
    <div className="mt-auto p-4">
      <Button 
        variant="ghost" 
        className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        onClick={onLogout}
      >
        <LogOut size={18} className="mr-2" />
        <span>Sair</span>
      </Button>
    </div>
  );
};

export default SidebarFooter;
