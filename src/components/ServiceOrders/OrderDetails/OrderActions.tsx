
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trash2, Printer, Calendar, Play, Check, MessageCircle } from 'lucide-react';
import { ServiceOrder } from '@/types';
import { toast } from 'sonner';
import { useDisplayNumber } from '@/hooks/useOrderNumber';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useAppData } from '@/hooks/useAppData';

interface OrderActionsProps {
  order: ServiceOrder;
  onDelete: (id: string) => Promise<boolean>;
}

const OrderActions: React.FC<OrderActionsProps> = ({ order, onDelete }) => {
  const navigate = useNavigate();
  const { updateServiceOrder } = useAppData();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const orderDisplayNumber = useDisplayNumber(order);

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      const success = await onDelete(order.id);
      if (success) {
        toast.success("Ordem de serviço excluída com sucesso");
        navigate('/orders');
      } else {
        toast.error("Erro ao excluir ordem de serviço");
      }
    } catch (error) {
      console.error("Erro ao excluir ordem:", error);
      toast.error("Erro ao excluir ordem de serviço");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success("Imprimindo ordem de serviço...");
  };

  const handleSendWhatsApp = () => {
    if (!order.clientPhone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }

    let message = `*${orderDisplayNumber}*\n\n` +
      `Cliente: ${order.clientName}\n`;

    // Verificar se temos múltiplos equipamentos
    const hasMultipleItems = order.serviceItems && order.serviceItems.length > 1;

    if (hasMultipleItems) {
      message += `*Múltiplos Equipamentos (${order.serviceItems.length})*\n\n`;

      // Adicionar detalhes de cada equipamento
      order.serviceItems.forEach((item, index) => {
        message += `*Equipamento ${index + 1}:* ${item.equipmentType}${item.equipmentModel ? ` - ${item.equipmentModel}` : ''}\n`;
        message += `Problema: ${item.clientDescription}\n`;
        message += `Tipo: ${item.serviceAttendanceType === 'em_domicilio' ? 'Em Domicílio' :
                          item.serviceAttendanceType === 'coleta_conserto' ? 'Coleta para Conserto' :
                          'Coleta para Diagnóstico'}\n\n`;
      });
    } else {
      message += `Equipamento: ${order.equipmentType}${order.equipmentModel ? ` - ${order.equipmentModel}` : ''}\n`;
      message += `Problema: ${order.description}\n`;
    }

    message += `Status: ${order.status === 'pending' ? 'Pendente' :
               order.status === 'scheduled' ? 'Agendado' :
               order.status === 'in_progress' ? 'Em Andamento' :
               order.status === 'completed' ? 'Concluído' :
               order.status === 'cancelled' ? 'Cancelado' : order.status}\n`;

    message += `Data de Criação: ${new Date(order.createdAt).toLocaleDateString('pt-BR')}\n`;

    if (order.scheduledDate) {
      message += `Data Agendada: ${new Date(order.scheduledDate).toLocaleDateString('pt-BR')} às ${order.scheduledTime}\n`;
    }

    message += `\nAtendimento Principal: ${order.serviceAttendanceType === 'em_domicilio' ? 'Em Domicílio' :
                       order.serviceAttendanceType === 'coleta_conserto' ? 'Coleta para Conserto' :
                       'Coleta para Diagnóstico'}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${order.clientPhone.replace(/\D/g, '')}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    toast.success("Abrindo WhatsApp...");
  };

  const handleScheduleService = async () => {
    if (order.status !== 'pending') return;

    setIsProcessing(true);
    try {
      navigate(`/orders/schedule/${order.id}`);
    } catch (error) {
      console.error("Erro ao agendar serviço:", error);
      toast.error("Erro ao agendar serviço");
      setIsProcessing(false);
    }
  };

  const handleStartService = async () => {
    if (order.status !== 'scheduled') return;

    setIsProcessing(true);
    try {
      const success = await updateServiceOrder(order.id, {
        status: 'in_progress',
        currentLocation: 'workshop'
      });

      if (success) {
        toast.success("Serviço iniciado com sucesso");
      } else {
        toast.error("Erro ao iniciar serviço");
      }
    } catch (error) {
      console.error("Erro ao iniciar serviço:", error);
      toast.error("Erro ao iniciar serviço");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteService = async () => {
    if (order.status !== 'in_progress') return;

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const success = await updateServiceOrder(order.id, {
        status: 'completed',
        completedDate: now
      });

      if (success) {
        toast.success("Serviço concluído com sucesso");
      } else {
        toast.error("Erro ao concluir serviço");
      }
    } catch (error) {
      console.error("Erro ao concluir serviço:", error);
      toast.error("Erro ao concluir serviço");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScheduleDelivery = async () => {
    const isDiagnosticCollection = order.serviceItems?.some(
      item => item.serviceAttendanceType === 'coleta_diagnostico'
    );

    if (!isDiagnosticCollection) {
      toast.error("Este serviço não é uma coleta diagnóstico.");
      return;
    }

    setIsProcessing(true);
    try {
      navigate(`/orders/schedule/${order.id}?mode=delivery`);
    } catch (error) {
      console.error("Erro ao agendar entrega:", error);
      toast.error("Erro ao agendar entrega");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex justify-between pt-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isProcessing}
          >
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
          {order.clientPhone && (
            <Button
              variant="outline"
              onClick={handleSendWhatsApp}
              disabled={isProcessing}
              className="text-green-600 hover:bg-green-50 border-green-200"
            >
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isProcessing}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
        </div>
        {order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <Button
                onClick={handleScheduleService}
                disabled={isProcessing}
              >
                <Calendar className="h-4 w-4 mr-2" /> Agendar Serviço
              </Button>
            )}
            {order.status === 'scheduled' && (
              <Button
                onClick={handleStartService}
                disabled={isProcessing}
              >
                <Play className="h-4 w-4 mr-2" /> Iniciar Serviço
              </Button>
            )}
            {order.status === 'in_progress' && (
              <Button
                onClick={handleCompleteService}
                disabled={isProcessing}
              >
                <Check className="h-4 w-4 mr-2" /> Concluir Serviço
              </Button>
            )}
          </div>
        )}
      </div>

      {order.status === 'in_progress' && order.serviceItems?.some(
        item => item.serviceAttendanceType === 'coleta_diagnostico'
      ) && (
        <Button
          onClick={handleScheduleDelivery}
          disabled={isProcessing}
        >
          <Calendar className="h-4 w-4 mr-2" /> Agendar Entrega
        </Button>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderActions;
