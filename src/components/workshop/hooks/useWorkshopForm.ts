
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkshopFormValues, workshopFormSchema, editWorkshopFormSchema } from '../schema/workshopFormSchema';

interface UseWorkshopFormProps {
  onSuccess?: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export const useWorkshopForm = ({ 
  onSuccess, 
  initialData, 
  isEditing = false 
}: UseWorkshopFormProps = {}) => {
  const { user, signUp, updateUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = isEditing ? editWorkshopFormSchema : workshopFormSchema;

  const form = useForm<WorkshopFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || user?.name || '',
      email: initialData?.email || user?.email || '',
      phone: initialData?.phone || user?.phone || '',
      password: '',
      address: initialData?.address || user?.address || '',
      city: initialData?.city || user?.city || '', 
      state: initialData?.state || user?.state || '',
      zipCode: initialData?.zip_code || user?.zip_code || '',
    }
  });

  useEffect(() => {
    if (formError) {
      toast.error(formError);
    }
  }, [formError]);

  const onSubmit = async (data: WorkshopFormValues) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      // Caso 1: Edição de oficina existente (quando initialData tem ID)
      if (isEditing && initialData?.id) {
        console.log('Editando oficina existente com ID:', initialData.id);
        await userService.updateUser(initialData.id, {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode || null,
          ...(data.password ? { password: data.password } : {})
        });
        toast.success('Oficina atualizada com sucesso.');
      } 
      // Caso 2: Criação de nova oficina (quando isEditing é falso)
      else if (!isEditing) {
        console.log('Criando nova oficina');
        const result = await signUp({
          email: data.email,
          password: data.password,
          name: data.name,
          role: 'workshop',
          phone: data.phone || undefined,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode || undefined,
        });

        if (result?.user) {
          toast.success('Oficina cadastrada com sucesso.');
        } else if (result?.error) {
          throw new Error(result.error.message || 'Erro ao cadastrar oficina');
        }
      } 
      // Caso 3: Atualização do perfil do usuário logado (sem initialData mas com user.id)
      else if (user?.id) {
        console.log('Atualizando perfil do usuário logado:', user.id);
        await updateUser({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          address: data.address,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode || null,
        });
        toast.success('Perfil atualizado com sucesso.');
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (e: any) {
      console.error('Erro no formulário:', e);
      setFormError(e.message || 'Erro ao processar dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { 
    form, 
    isSubmitting, 
    formError, 
    onSubmit 
  };
};
