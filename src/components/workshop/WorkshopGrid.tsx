
import React from 'react';
import { User } from '@/types';
import WorkshopCard from './WorkshopCard';
import { Loader2, Factory } from 'lucide-react';

interface WorkshopGridProps {
  workshops: User[];
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (workshop: User) => void;
  isLoading: boolean;
}

export const WorkshopGrid: React.FC<WorkshopGridProps> = ({
  workshops,
  onDelete,
  onEdit,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (workshops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <Factory className="h-12 w-12 mb-2 text-amber-600/50" />
        <p className="text-lg font-medium">Nenhuma oficina cadastrada</p>
        <p className="text-sm">Adicione uma nova oficina para começar.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {workshops.map((workshop) => (
        <WorkshopCard
          key={workshop.id}
          workshop={workshop}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
