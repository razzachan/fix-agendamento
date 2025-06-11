
import { z } from 'zod';

// Schema original para criação de nova oficina
export const workshopFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().optional(),
});

// Schema para edição com senha realmente opcional
export const editWorkshopFormSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos').optional(),
  password: z.string().refine(
    (val) => val.length === 0 || val.length >= 6,
    { message: 'A senha deve ter pelo menos 6 caracteres ou ser deixada em branco' }
  ).optional(),
  address: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado é obrigatório'),
  zipCode: z.string().optional(),
});

export type WorkshopFormValues = z.infer<typeof workshopFormSchema>;
