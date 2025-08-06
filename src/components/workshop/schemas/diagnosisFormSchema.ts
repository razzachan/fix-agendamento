
import * as z from 'zod';

export const diagnosisFormSchema = z.object({
  diagnosis_details: z.string().min(1, 'O diagnóstico é obrigatório'),
  recommended_service: z.string().min(1, 'O serviço recomendado é obrigatório'),
  parts_purchase_link: z.string().url('Informe uma URL válida').optional().or(z.literal('')),
});

export type DiagnosisFormData = z.infer<typeof diagnosisFormSchema>;
