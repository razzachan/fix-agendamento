
import { ServiceOrder } from '@/types';
import { FormValues } from '../types';
import { useToast } from '@/hooks/use-toast';
import { formatServiceOrderData } from './serviceOrderDataFormatter';
import { NotificationTriggers } from '@/services/notifications/notificationTriggers';

export const useFormSubmissionHandler = () => {
  const { toast } = useToast();
  const notificationTriggers = new NotificationTriggers();

  const handleSubmit = async (values: FormValues, onSubmit: (data: Partial<ServiceOrder>) => Promise<ServiceOrder | null>) => {
    try {
      // Format service order data from form values
      const serviceOrderData = formatServiceOrderData(values);
      
      // Log client identification data for debugging
      console.log("Submitting service order with client identification data:", {
        name: serviceOrderData.clientName,
        email: serviceOrderData.clientEmail,
        phone: serviceOrderData.clientPhone,
        addressDetails: {
          address: serviceOrderData.pickupAddress,
          city: serviceOrderData.pickupCity,
          state: serviceOrderData.pickupState,
          zipCode: serviceOrderData.pickupZipCode
        }
      });
      
      // Submit the formatted data
      const createdOrder = await onSubmit(serviceOrderData);
      
      if (createdOrder) {
        // Disparar notificações para criação de ordem
        try {
          await notificationTriggers.onOrderCreated(createdOrder);
          console.log(`🔔 [FormSubmissionHandler] Notificações disparadas para criação de ordem`);
        } catch (error) {
          console.error(`❌ [FormSubmissionHandler] Erro ao disparar notificações:`, error);
        }

        // Show appropriate toast message based on whether email was provided
        if (values.clientEmail) {
          toast({
            title: "Ordem de Serviço Criada",
            description: "A ordem de serviço foi criada com sucesso. Uma conta de cliente também foi criada com senha padrão '123456'.",
          });
        } else {
          toast({
            title: "Ordem de Serviço Criada",
            description: "A ordem de serviço foi criada com sucesso.",
          });
        }
      } else {
        toast({
          title: "Aviso",
          description: "A ordem foi criada, mas pode haver problemas com os dados do cliente. Verifique na aba Clientes.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Erro ao processar formulário:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a ordem de serviço. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return { handleSubmit };
};
