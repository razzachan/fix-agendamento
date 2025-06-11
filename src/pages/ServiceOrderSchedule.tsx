
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppData } from '@/hooks/useAppData';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import SchedulingWrapper from '@/components/ServiceOrderForm/Scheduling';

const ServiceOrderSchedule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { serviceOrders, updateServiceOrder } = useAppData();
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState(null);
  
  const form = useForm({
    defaultValues: {
      technicianId: '',
      scheduledDate: '',
      scheduledTime: '',
    }
  });

  useEffect(() => {
    if (serviceOrders.length) {
      const currentOrder = serviceOrders.find(o => o.id === id);
      if (currentOrder) {
        setOrder(currentOrder);
      } else {
        toast.error("Ordem de serviço não encontrada");
        navigate('/orders');
      }
    }
  }, [id, serviceOrders, navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Create a date string combining date and time
      const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      
      const success = await updateServiceOrder(id, {
        status: 'scheduled',
        technicianId: data.technicianId,
        scheduledDate: scheduledDateTime.toISOString()
      });
      
      if (success) {
        toast.success("Serviço agendado com sucesso");
        navigate(`/orders/${id}`);
      } else {
        toast.error("Erro ao agendar serviço");
      }
    } catch (error) {
      console.error("Erro ao agendar:", error);
      toast.error("Erro ao agendar serviço");
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) {
    return (
      <div className="container py-6 space-y-6">
        <div className="flex items-center">
          <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <h1 className="text-2xl font-bold">Carregando...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="outline" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
        <h1 className="text-2xl font-bold">Agendar Serviço</h1>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarCheck className="mr-2 h-5 w-5" /> 
            Agendamento para OS #{order.id.substring(0, 8)}
          </CardTitle>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <h3 className="text-lg mb-4">
                Cliente: <span className="font-medium">{order.clientName}</span>
              </h3>
              
              <SchedulingWrapper />
            </CardContent>
            
            <CardFooter className="border-t pt-6">
              <div className="flex justify-between w-full">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(`/orders/${id}`)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !form.formState.isValid}
                >
                  {isLoading ? "Agendando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ServiceOrderSchedule;
