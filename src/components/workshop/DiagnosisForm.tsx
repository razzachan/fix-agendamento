
import React from 'react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { DiagnosisFormFields } from './DiagnosisFormFields';
import { useDiagnosisForm } from './hooks/useDiagnosisForm';

interface DiagnosisFormProps {
  serviceOrderId: string;
  onSuccess: () => void;
}

export interface FormValues {
  diagnosis_details: string;
  recommended_service: string;
  parts_purchase_link: string;
}

export function DiagnosisForm({ serviceOrderId, onSuccess }: DiagnosisFormProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      diagnosis_details: '',
      recommended_service: '',
      parts_purchase_link: '',
    }
  });

  const { isSubmitting, handleSubmit } = useDiagnosisForm({
    serviceOrderId,
    onSuccess
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <DiagnosisFormFields form={form} />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : 'Salvar Diagnóstico'}
        </Button>
      </form>
    </Form>
  );
}
