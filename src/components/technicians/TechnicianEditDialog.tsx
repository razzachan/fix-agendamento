
import React from 'react';
import { Wrench } from 'lucide-react';
import FormDialog from '@/components/shared/FormDialog';
import TechnicianForm from '@/components/TechnicianForm';
import { Technician } from '@/types';

interface TechnicianEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technician: Technician | null;
  onSuccess: () => void;
}

const TechnicianEditDialog: React.FC<TechnicianEditDialogProps> = ({
  open,
  onOpenChange,
  technician,
  onSuccess
}) => {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Técnico"
      description="Modifique os dados do técnico nos campos abaixo."
      icon={Wrench}
      maxWidth="550px"
    >
      <TechnicianForm 
        initialData={technician} 
        onSuccess={onSuccess}
        isEditing={true}
      />
    </FormDialog>
  );
};

export default TechnicianEditDialog;
