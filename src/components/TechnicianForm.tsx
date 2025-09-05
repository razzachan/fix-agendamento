
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Technician } from '@/types';
import { technicianService } from '@/services';
import { Loader2, Save, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneNumber } from '@/utils/phoneFormatter';
import { Checkbox } from '@/components/ui/checkbox';

const technicianSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  specialties: z.string().optional(),
  isActive: z.boolean().default(true),
  groups: z.array(z.enum(['A','B','C'])).default(['A','B']),
  weight: z.coerce.number().min(0).max(1000).default(0).optional(),
});

type FormData = z.infer<typeof technicianSchema>;

interface TechnicianFormProps {
  onSuccess: () => void;
  initialData?: Technician | null;
  isEditing?: boolean;
}

const TechnicianForm: React.FC<TechnicianFormProps> = ({ onSuccess, initialData, isEditing = false }) => {
  const form = useForm<FormData>({
    resolver: zodResolver(technicianSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      specialties: initialData?.specialties ? initialData.specialties.join(', ') : '',
      isActive: initialData?.isActive !== false,
      groups: (initialData?.groups as any) || ['A','B'],
      weight: (initialData as any)?.weight ?? 0,
    },
  });

  const { handleSubmit, formState, reset } = form;
  const { isSubmitting } = formState;

  // Espelhar dados ao abrir modal/alterar técnico selecionado
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        specialties: initialData.specialties ? initialData.specialties.join(', ') : '',
        isActive: initialData.isActive !== false,
        groups: (initialData.groups as any) || ['A','B'],
        weight: (initialData as any)?.weight ?? 0,
      });
    }
  }, [initialData?.id, (initialData as any)?.weight]);

  const onSubmit = async (data: FormData) => {
    try {
      const specialtiesArray = data.specialties
        ? data.specialties.split(',').map(item => item.trim()).filter(Boolean)
        : [];

      if (isEditing && initialData) {
        await technicianService.updateTechnician({
          id: initialData.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          specialties: specialtiesArray,
          isActive: data.isActive,
          groups: data.groups,
          weight: (data as any).weight ?? 0,
        });

        toast.success('Técnico atualizado com sucesso!');
      } else {
        await technicianService.createTechnician({
          name: data.name,
          email: data.email,
          phone: data.phone,
          specialties: specialtiesArray,
          isActive: data.isActive,
          groups: data.groups,
          weight: (data as any).weight ?? 0,
        });

        toast.success('Técnico cadastrado com sucesso!');
      }

      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar técnico:', error);
      toast.error('Erro ao salvar técnico', {
        description: 'Verifique os dados e tente novamente.'
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} disabled={isEditing} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(00) 00000-0000"
                    {...field}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      field.onChange(formatted);
                    }}
                    maxLength={15}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="specialties"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidades</FormLabel>
                <FormControl>
                  <Input placeholder="Reparos, Instalações, etc (separados por vírgula)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

          {/* Grupos de atendimento */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Grupos de atendimento</div>
            <div className="flex gap-4">
              {(['A','B','C'] as const).map(g => (
                <label key={g} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.watch('groups')?.includes(g)}
                    onCheckedChange={(checked)=>{
                      const current = new Set(form.getValues('groups') || ['A','B']);
                      if (checked) current.add(g); else current.delete(g);
                      form.setValue('groups', Array.from(current) as any, { shouldDirty: true });
                    }}
                  />
                  Grupo {g}
                </label>
              ))}
            </div>
          </div>

          {/* Prioridade (weight) */}
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade do técnico</FormLabel>
                <div className="flex items-center gap-4">
                  <Input type="number" min={0} max={1000} step={10} {...field} value={field.value ?? 0} className="w-32" />
                  <span className="text-sm text-muted-foreground">Maior = mais prioridade na distribuição</span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Técnico ativo</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Técnicos inativos não aparecerão nas listagens de agendamento.
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Atualizar
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Cadastrar
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TechnicianForm;
