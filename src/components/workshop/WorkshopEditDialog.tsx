
import React from 'react';
import { Factory } from 'lucide-react';
import FormDialog from '@/components/shared/FormDialog';
import WorkshopForm from '@/components/workshop/WorkshopForm';
import { User } from '@/types';

interface WorkshopEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshop: User | null;
  onSuccess: () => void;
}

const WorkshopEditDialog: React.FC<WorkshopEditDialogProps> = ({
  open,
  onOpenChange,
  workshop,
  onSuccess
}) => {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Oficina"
      description="Modifique os dados da oficina nos campos abaixo."
      icon={Factory}
    >
      <WorkshopForm 
        initialData={workshop} 
        onSuccess={onSuccess}
        isEditing={true}
      />
    </FormDialog>
  );
};

export default WorkshopEditDialog;
