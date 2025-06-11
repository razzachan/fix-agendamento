
import React from 'react';
import { Factory, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useWorkshopForm } from './hooks/useWorkshopForm';
import WorkshopFormError from './components/WorkshopFormError';
import WorkshopBasicInfoFields from './components/WorkshopBasicInfoFields';
import WorkshopAddressFields from './components/WorkshopAddressFields';
import { User } from '@/types';

interface WorkshopFormProps {
  onSuccess?: () => void;
  initialData?: User | null;
  isEditing?: boolean;
}

const WorkshopForm: React.FC<WorkshopFormProps> = ({ onSuccess, initialData, isEditing = false }) => {
  const { form, isSubmitting, formError, onSubmit } = useWorkshopForm({ 
    onSuccess, 
    initialData,
    isEditing 
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <WorkshopFormError error={formError} />
        
        <WorkshopBasicInfoFields form={form} isEditing={isEditing} />
        <WorkshopAddressFields form={form} />
        
        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Factory className="h-4 w-4 mr-2" />}
            {isSubmitting 
              ? (isEditing ? 'Atualizando...' : 'Cadastrando...') 
              : (isEditing ? 'Atualizar Oficina' : 'Cadastrar Oficina')
            }
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkshopForm;
