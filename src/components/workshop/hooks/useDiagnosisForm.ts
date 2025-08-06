
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { serviceEventService } from '@/services';
import { useAppData } from '@/hooks/useAppData';
import { FormValues } from '../DiagnosisForm';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import { supabase } from '@/integrations/supabase/client';
import { mapServiceOrder } from '@/services/serviceOrder/queries/mapServiceOrder';

interface UseDiagnosisFormProps {
  serviceOrderId: string;
  onSuccess: () => void;
}

export function useDiagnosisForm({ serviceOrderId, onSuccess }: UseDiagnosisFormProps) {
  const { user } = useAuth();
  const { refreshServiceOrders, updateServiceOrder } = useAppData();
  const { triggerDiagnosisCompleted } = useNotificationTriggers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (values: FormValues) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (user.role !== 'workshop') {
      toast.error('Apenas usuários da oficina podem adicionar diagnósticos');
      return;
    }

    if (!values.diagnosis_details) {
      toast.error('Preencha os detalhes do diagnóstico');
      return;
    }

    setIsSubmitting(true);
    toast.info('Enviando diagnóstico...');

    try {
      // Prepare the diagnosis data
      const diagnosisData = {
        diagnosis_details: values.diagnosis_details,
        recommended_service: values.recommended_service || '',
        parts_purchase_link: values.parts_purchase_link || null,
      };

      console.log('Dados do diagnóstico a serem salvos:', JSON.stringify(diagnosisData));
      
      // Save diagnosis event
      const success = await serviceEventService.createDiagnosisEvent(
        serviceOrderId,
        String(user.id),
        diagnosisData
      );
      
      if (success) {
        // Update the service order status to "diagnosis_completed"
        console.log('Atualizando status da ordem para diagnosis_completed');
        await updateServiceOrder(serviceOrderId, { status: 'diagnosis_completed' });

        // Buscar dados da ordem para notificações
        const { data: orderData } = await supabase
          .from('service_orders')
          .select('*')
          .eq('id', serviceOrderId)
          .single();

        if (orderData) {
          const serviceOrder = mapServiceOrder(orderData);
          // Disparar notificações de diagnóstico completo
          await triggerDiagnosisCompleted(serviceOrder, diagnosisData);
        }

        toast.success('Diagnóstico registrado com sucesso!');
        
        try {
          // Garantir múltiplas tentativas de atualização dos dados
          console.log('Atualizando dados após salvar diagnóstico');
          
          // Esperar um pouco antes de atualizar para garantir que o banco de dados esteja atualizado
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Atualizar os dados
          await refreshServiceOrders();
          console.log('Dados das ordens de serviço atualizados');
          
          // Chamar onSuccess após um pequeno atraso
          setTimeout(() => {
            console.log('Chamando onSuccess após salvar diagnóstico');
            onSuccess();
          }, 500);
        } catch (refreshError) {
          console.error('Erro ao atualizar dados:', refreshError);
          onSuccess(); // Ainda chamar success mesmo se o refresh falhar
        }
      } else {
        toast.error('Não foi possível registrar o diagnóstico. Por favor, tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar diagnóstico:', error);
      toast.error(`Erro ao salvar diagnóstico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [serviceOrderId, user, onSuccess, refreshServiceOrders, updateServiceOrder]);

  return {
    isSubmitting,
    handleSubmit
  };
}
