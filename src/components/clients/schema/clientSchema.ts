
import { z } from 'zod';

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$|^\d{10,11}$/, {
      message: 'Formato inválido. Use (99) 99999-9999 ou apenas números',
    })
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  userId: z.string().optional().or(z.literal('')),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
