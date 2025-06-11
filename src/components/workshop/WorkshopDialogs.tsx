
import React from 'react';
import { User } from '@/types';
import WorkshopFormDialog from './WorkshopFormDialog';
import WorkshopEditDialog from './WorkshopEditDialog';

interface WorkshopDialogsProps {
  formDialogOpen: boolean;
  setFormDialogOpen: (open: boolean) => void;
  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  selectedWorkshop: User | null;
  onAddSuccess: () => void;
  onEditSuccess: () => void;
}

const WorkshopDialogs: React.FC<WorkshopDialogsProps> = ({
  formDialogOpen,
  setFormDialogOpen,
  editDialogOpen,
  setEditDialogOpen,
  selectedWorkshop,
  onAddSuccess,
  onEditSuccess
}) => {
  return (
    <>
      <WorkshopFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={onAddSuccess}
      />

      <WorkshopEditDialog 
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        workshop={selectedWorkshop}
        onSuccess={onEditSuccess}
      />
    </>
  );
};

export default WorkshopDialogs;
