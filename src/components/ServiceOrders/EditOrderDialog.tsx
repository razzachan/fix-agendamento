import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceOrder, ServiceOrderItem } from '@/types';
import ServiceOrderForm from '@/components/ServiceOrderForm';
import { useAppData } from '@/hooks/useAppData';
import { toast } from 'sonner';
import { generateUUID } from '@/utils/uuid';

interface EditOrderDialogProps {
  order: ServiceOrder;
  onUpdated?: (updatedOrder: ServiceOrder) => void;
}

const EditOrderDialog: React.FC<EditOrderDialogProps> = ({ order, onUpdated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processedOrder, setProcessedOrder] = useState<ServiceOrder | null>(null);
  const { updateServiceOrder } = useAppData();

  useEffect(() => {
    if (order && isOpen) {
      let serviceAttendanceType = order.serviceAttendanceType;
      
      if (!serviceAttendanceType || typeof serviceAttendanceType === 'object') {
        if (order.description) {
          if (order.description.includes('Em domicílio')) {
            serviceAttendanceType = 'em_domicilio';
          } else if (order.description.includes('Coleta para conserto')) {
            serviceAttendanceType = 'coleta_conserto';
          } else if (order.description.includes('Coleta para diagnóstico')) {
            serviceAttendanceType = 'coleta_diagnostico';
          }
        }
        
        if (!serviceAttendanceType || typeof serviceAttendanceType === 'object') {
          serviceAttendanceType = 'em_domicilio';
        }
      }
      
      let clientDescription = order.clientDescription || '';
      if (!clientDescription && order.description) {
        const descriptionParts = order.description.split('\n');
        if (descriptionParts.length > 1) {
          clientDescription = descriptionParts.slice(1).join('\n').trim();
        }
      }
      
      let scheduledTime = '';
      if (order.scheduledDate) {
        const dateObj = new Date(order.scheduledDate);
        scheduledTime = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
      }
      
      const serviceItem: ServiceOrderItem = {
        id: order.serviceItems?.[0]?.id || generateUUID(),
        serviceOrderId: order.id,
        serviceType: order.serviceItems?.[0]?.serviceType || '',
        serviceAttendanceType: order.serviceItems?.[0]?.serviceAttendanceType || serviceAttendanceType,
        equipmentType: order.equipmentType || '',
        equipmentModel: order.equipmentModel || '',
        equipmentSerial: order.equipmentSerial || '',
        clientDescription: order.serviceItems?.[0]?.clientDescription || clientDescription,
        serviceValue: order.serviceItems?.[0]?.serviceValue || ''
      };
      
      let city = order.pickupCity || '';
      let state = order.pickupState || '';
      let zipCode = order.pickupZipCode || '';
      
      if (!city || !state) {
        const addressParts = (order.pickupAddress || '').split(',');
        if (addressParts.length > 1) {
          const cityStatePart = addressParts[1].trim();
          const cityStateParts = cityStatePart.split('-');
          if (cityStateParts.length > 1) {
            if (!city) city = cityStateParts[0].trim();
            if (!state) state = cityStateParts[1].trim();
          }
        }
      }
      
      const processed: ServiceOrder = {
        ...order,
        serviceItems: [serviceItem],
        clientFullAddress: order.pickupAddress || '',
        clientCity: order.pickupCity || '',
        clientState: order.pickupState || '',
        clientZipCode: order.pickupZipCode || '',
        serviceAttendanceType,
        clientDescription,
        scheduledTime,
        clientCpfCnpj: order.clientCpfCnpj || '',
        clientAddressComplement: order.clientAddressComplement || '',
        clientAddressReference: order.clientAddressReference || '',
        clientPhone: order.clientPhone || '',
        clientEmail: order.clientEmail || ''
      };
      
      console.log('Processed order for form:', processed);
      setProcessedOrder(processed);
    }
  }, [order, isOpen]);

  const handleSubmit = async (updatedOrderData: Partial<ServiceOrder>): Promise<ServiceOrder | null> => {
    if (!order.id) return null;
    
    try {
      setIsSubmitting(true);
      console.log('Submitting updated order data:', updatedOrderData);
      const success = await updateServiceOrder(order.id, updatedOrderData);
      
      if (success) {
        const updatedOrder = { ...order, ...updatedOrderData } as ServiceOrder;
        toast.success('Ordem de serviço atualizada com sucesso!');
        setIsOpen(false);
        
        if (onUpdated) {
          onUpdated(updatedOrder);
        }
        
        return updatedOrder;
      }
      
      toast.error('Erro ao atualizar ordem de serviço.');
      return null;
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao atualizar ordem de serviço.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleOpenDialog = () => {
    console.log('Opening edit dialog with order:', order);
    setIsOpen(true);
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={handleOpenDialog}
      >
        <Edit className="h-4 w-4" />
        Editar Ordem
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ordem #{order.id.substring(0, 8)}</DialogTitle>
          </DialogHeader>
          {isOpen && processedOrder && (
            <ServiceOrderForm 
              onSubmit={handleSubmit} 
              onCancel={handleCancel}
              initialValues={processedOrder}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditOrderDialog;
