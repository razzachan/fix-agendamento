
import React from 'react';

interface DashboardHeaderProps {
  heading?: string;
  text?: string;
  icon?: React.ReactNode;
  userRole?: string;
  children?: React.ReactNode;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  heading = "Dashboard", 
  text, 
  icon, 
  userRole, 
  children 
}) => {
  return (
    <div className="flex justify-between items-center pb-6">
      <div className="flex items-center gap-2">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
          {text && <p className="text-sm text-muted-foreground">{text}</p>}
          {userRole && (
            <p className="text-sm text-muted-foreground">
              Visão geral do sistema - {
                userRole === 'admin' ? 'Administrador' :
                userRole === 'technician' ? 'Técnico' :
                userRole === 'workshop' ? 'Oficina' : 'Cliente'
              }
            </p>
          )}
        </div>
      </div>
      {children && <div>{children}</div>}
    </div>
  );
};

export default DashboardHeader;
