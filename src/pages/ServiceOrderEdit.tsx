
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppData } from '@/hooks/useAppData';
import { ServiceOrder } from '@/types';
import ServiceOrderForm from '@/components/ServiceOrderForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useDisplayNumber } from '@/hooks/useOrderNumber';

const ServiceOrderEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { serviceOrders, updateServiceOrder, refreshServiceOrders } = useAppData();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const orderDisplayNumber = useDisplayNumber(order);
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await refreshServiceOrders();
        
        if (id) {
          const foundOrder = serviceOrders.find(o => o.id === id);
          
          if (foundOrder) {
            // Ensure all required fields are properly set with default values
            const processedOrder = {
              ...foundOrder,
              clientPhone: foundOrder.clientPhone || '',
              clientEmail: foundOrder.clientEmail || '',
              clientCpfCnpj: foundOrder.clientCpfCnpj || '',
              clientAddressComplement: foundOrder.clientAddressComplement || '',
              clientAddressReference: foundOrder.clientAddressReference || '',
              scheduledTime: foundOrder.scheduledDate ? 
                new Date(foundOrder.scheduledDate).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}) : 
                ''
            };
            
            setOrder(processedOrder);
            console.log("Loaded service order for editing:", processedOrder);
          } else {
            console.warn(`Service order with ID ${id} not found`);
            toast.error('Ordem de serviço não encontrada');
          }
        }
      } catch (error) {
        console.error('Erro ao carregar ordem de serviço:', error);
        toast.error('Erro ao carregar dados da ordem de serviço');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [id, refreshServiceOrders, serviceOrders]);
  
  const handleSubmit = async (updatedOrderData: Partial<ServiceOrder>): Promise<ServiceOrder | null> => {
    if (!id || !order) return null;
    
    try {
      console.log("Submitting updated order data:", updatedOrderData);
      const success = await updateServiceOrder(id, updatedOrderData);
      
      if (success) {
        toast.success('Ordem de serviço atualizada com sucesso!');
        navigate(`/orders/${id}`);
        return { ...order, ...updatedOrderData } as ServiceOrder;
      }
      
      toast.error('Erro ao atualizar ordem de serviço.');
      return null;
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao atualizar ordem de serviço.');
      return null;
    }
  };
  
  const handleCancel = () => {
    navigate(`/orders/${id}`);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          className="flex items-center gap-2"
          onClick={() => navigate('/orders')}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para ordens de serviço
        </Button>
        <div className="py-12 text-center">
          <h1 className="text-2xl font-bold mb-2">Ordem não encontrada</h1>
          <p className="text-muted-foreground">A ordem de serviço solicitada não foi encontrada no sistema.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2"
            onClick={() => navigate(`/orders/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Editar {orderDisplayNumber}
          </h1>
        </div>
      </div>
      
      <ServiceOrderForm 
        onSubmit={handleSubmit} 
        onCancel={handleCancel}
        initialValues={order}
        key={order.id} // Adicionar key para garantir recriação do formulário quando a ordem mudar
      />
    </div>
  );
};

export default ServiceOrderEdit;
