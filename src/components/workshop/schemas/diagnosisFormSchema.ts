
import * as z from 'zod';

export const diagnosisFormSchema = z.object({
  diagnosis_details: z.string().min(1, 'O diagnóstico é obrigatório'),
  recommended_service: z.string().min(1, 'O serviço recomendado é obrigatório'),
  estimated_cost: z.string().min(1, 'O custo estimado é obrigatório'),
  estimated_completion_date: z.string().min(1, 'A data estimada é obrigatória'),
  parts_purchase_link: z.string().url('Informe uma URL válida').optional().or(z.literal('')),
});

export type DiagnosisFormData = z.infer<typeof diagnosisFormSchema>;
