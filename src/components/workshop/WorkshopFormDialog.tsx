
import React from 'react';
import { Factory } from 'lucide-react';
import FormDialog from '@/components/shared/FormDialog';
import WorkshopForm from './WorkshopForm';

interface WorkshopFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const WorkshopFormDialog: React.FC<WorkshopFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar Nova Oficina"
      description="Preencha os dados da oficina nos campos abaixo."
      icon={Factory}
    >
      <WorkshopForm onSuccess={onSuccess} />
    </FormDialog>
  );
};

export default WorkshopFormDialog;
