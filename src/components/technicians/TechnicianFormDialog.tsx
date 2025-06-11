
import React from 'react';
import { Wrench } from 'lucide-react';
import FormDialog from '@/components/shared/FormDialog';
import TechnicianForm from '@/components/TechnicianForm';
import { Technician } from '@/types';

interface TechnicianFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTechnician: Technician | null;
  onSuccess: () => void;
}

const TechnicianFormDialog: React.FC<TechnicianFormDialogProps> = ({
  open,
  onOpenChange,
  selectedTechnician,
  onSuccess
}) => {
  const title = selectedTechnician ? 'Editar Técnico' : 'Adicionar Novo Técnico';
  
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Preencha os dados do técnico nos campos abaixo."
      icon={Wrench}
      maxWidth="550px"
    >
      <TechnicianForm 
        initialData={selectedTechnician} 
        onSuccess={onSuccess}
        isEditing={!!selectedTechnician}
      />
    </FormDialog>
  );
};

export default TechnicianFormDialog;
