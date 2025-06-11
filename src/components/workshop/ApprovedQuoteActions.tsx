import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, Package, Wrench, Clock } from 'lucide-react';
import { RepairProgressDialog } from './RepairProgressDialog';
import { CompleteRepairDialog } from './CompleteRepairDialog';
import { toast } from 'sonner';

interface ApprovedQuoteActionsProps {
  order: {
    id: string;
    client_name: string;
    equipment_type: string;
    equipment_model?: string;
    status: string;
    service_attendance_type: string;
  };
  onStatusUpdate: () => void;
}

export function ApprovedQuoteActions({ order, onStatusUpdate }: ApprovedQuoteActionsProps) {
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Determinar qual ação mostrar baseado no status
  const getActionButton = () => {
    switch (order.status) {
      case 'quote_approved':
        return (
          <Button 
            onClick={() => setShowProgressDialog(true)}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <Play className="h-4 w-4 mr-2" />
            Iniciar Reparo
          </Button>
        );
        
      case 'in_progress':
        return (
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowProgressDialog(true)}
              variant="outline"
              size="sm"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Atualizar Progresso
            </Button>
            <Button 
              onClick={() => setShowCompleteDialog(true)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Concluir Reparo
            </Button>
          </div>
        );
        
      case 'ready_for_delivery':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Package className="h-3 w-3 mr-1" />
            Pronto para Entrega
          </Badge>
        );
        
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'quote_approved':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Orçamento Aprovado
          </Badge>
        );
        
      case 'in_progress':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Wrench className="h-3 w-3 mr-1" />
            Em Reparo
          </Badge>
        );
        
      case 'ready_for_delivery':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Package className="h-3 w-3 mr-1" />
            Pronto para Entrega
          </Badge>
        );
        
      default:
        return null;
    }
  };

  const handleProgressSuccess = () => {
    setShowProgressDialog(false);
    onStatusUpdate();
    toast.success('Progresso do reparo atualizado com sucesso!');
  };

  const handleCompleteSuccess = () => {
    setShowCompleteDialog(false);
    onStatusUpdate();
    toast.success('Reparo concluído com sucesso!');
  };

  // Só mostrar para ordens com orçamento aprovado ou em reparo
  if (!['quote_approved', 'in_progress', 'ready_for_delivery'].includes(order.status)) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusBadge()}
            </div>
            <div className="text-sm text-gray-600">
              {order.status === 'quote_approved' && 'Orçamento aprovado pelo cliente. Pronto para iniciar reparo.'}
              {order.status === 'in_progress' && 'Reparo em andamento. Atualize o progresso conforme necessário.'}
              {order.status === 'ready_for_delivery' && 'Reparo concluído. Equipamento pronto para entrega.'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {getActionButton()}
          </div>
        </div>
      </div>

      <RepairProgressDialog
        open={showProgressDialog}
        onOpenChange={setShowProgressDialog}
        order={order}
        onSuccess={handleProgressSuccess}
      />

      <CompleteRepairDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        order={order}
        onSuccess={handleCompleteSuccess}
      />
    </>
  );
}
