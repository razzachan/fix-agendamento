
import React from 'react';
import { Plus, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkshopActionsProps {
  isAdmin: boolean;
  onAddWorkshop: () => void;
}

const WorkshopActions: React.FC<WorkshopActionsProps> = ({
  isAdmin,
  onAddWorkshop
}) => {
  if (!isAdmin) return null;
  
  return (
    <div className="flex mb-4">
      <Button 
        onClick={onAddWorkshop} 
        className="shadow-md bg-amber-600 hover:bg-amber-700"
      >
        <Plus className="h-4 w-4 mr-2" /> Adicionar Oficina
      </Button>
    </div>
  );
};

export default WorkshopActions;
