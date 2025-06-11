
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Factory } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WorkshopManagement from '@/components/workshop/WorkshopManagement';

const Workshops: React.FC = () => {
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Oficinas</h1>
      </div>
      
      <WorkshopManagement isAdmin={isAdmin} />
    </div>
  );
};

export default Workshops;
