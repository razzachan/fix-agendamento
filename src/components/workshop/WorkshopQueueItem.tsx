import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  GripVertical,
  Clock,
  AlertTriangle,
  CheckCircle,
  User,
  Wrench,
  Package,
  DollarSign,
  Zap,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { QueueItem } from '@/services/workshop/workshopQueueService';
import { translateStatus } from '@/utils/statusMapping';

interface WorkshopQueueItemProps {
  item: QueueItem;
  onReorder: (itemId: string, newPosition: number) => Promise<boolean>;
  formatTime: (hours: number) => string;
}

export function WorkshopQueueItem({ item, onReorder, formatTime }: WorkshopQueueItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  const getCategoryIcon = (category: QueueItem['category']) => {
    switch (category) {
      case 'urgent':
        return <Zap className="h-4 w-4 text-red-500" />;
      case 'diagnosis_pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'repair_approved':
        return <Wrench className="h-4 w-4 text-blue-500" />;
      case 'awaiting_approval':
        return <DollarSign className="h-4 w-4 text-yellow-500" />;
      case 'ready_delivery':
        return <Package className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: QueueItem['category']) => {
    switch (category) {
      case 'urgent':
        return 'Urgente';
      case 'diagnosis_pending':
        return 'Aguardando Diagnóstico';
      case 'repair_approved':
        return 'Reparo Aprovado';
      case 'awaiting_approval':
        return 'Aguardando Aprovação';
      case 'ready_delivery':
        return 'Pronto para Entrega';
      default:
        return 'Pendente';
    }
  };

  const getSLABadgeColor = (slaStatus: QueueItem['slaStatus']) => {
    switch (slaStatus) {
      case 'on_time':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSLALabel = (slaStatus: QueueItem['slaStatus']) => {
    switch (slaStatus) {
      case 'on_time':
        return 'No Prazo';
      case 'warning':
        return 'Atenção';
      case 'overdue':
        return 'Atrasado';
      default:
        return 'Indefinido';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'at_workshop':
      case 'received_at_workshop':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'diagnosis_completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'quote_sent':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'quote_approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ready_for_delivery':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleMoveUp = async () => {
    if (item.queuePosition <= 1 || !item.canReorder) return;
    
    setIsReordering(true);
    await onReorder(item.id, item.queuePosition - 1);
    setIsReordering(false);
  };

  const handleMoveDown = async () => {
    if (!item.canReorder) return;
    
    setIsReordering(true);
    await onReorder(item.id, item.queuePosition + 1);
    setIsReordering(false);
  };

  return (
    <Card 
      className={`transition-all duration-200 ${
        isDragging ? 'shadow-lg scale-105' : 'hover:shadow-md'
      } ${
        item.urgente ? 'border-red-200 bg-red-50' : ''
      } ${
        item.slaStatus === 'overdue' ? 'border-red-300' : ''
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Drag Handle e Posição */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-600">
                #{item.queuePosition}
              </span>
              {item.canReorder && (
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleMoveUp}
                    disabled={item.queuePosition <= 1 || isReordering}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleMoveDown}
                    disabled={isReordering}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {item.canReorder && (
              <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
            )}
          </div>

          {/* Informações Principais */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getCategoryIcon(item.category)}
              <h3 className="font-semibold text-gray-900 truncate">
                {item.clientName}
              </h3>
              {item.urgente && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <Zap className="h-3 w-3 mr-1" />
                  URGENTE
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                <span>{item.equipmentType}</span>
                {item.equipmentModel && (
                  <span className="text-gray-500">- {item.equipmentModel}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Na oficina há {formatTime(item.timeInWorkshop)}</span>
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                {item.description}
              </p>
            )}
          </div>

          {/* Status e Badges */}
          <div className="flex flex-col items-end gap-2">
            <Badge className={getStatusBadgeColor(item.status)}>
              {translateStatus(item.status)}
            </Badge>
            
            <Badge className={getSLABadgeColor(item.slaStatus)}>
              {getSLALabel(item.slaStatus)}
            </Badge>

            <div className="text-xs text-gray-500 text-right">
              <div>Categoria: {getCategoryLabel(item.category)}</div>
              <div>Estimativa: {formatTime(item.estimatedTime)}</div>
              <div>
                Prazo: {new Date(item.slaDeadline).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>

          {/* Indicadores Visuais */}
          <div className="flex flex-col items-center gap-1">
            {item.slaStatus === 'overdue' && (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
            {item.slaStatus === 'warning' && (
              <Clock className="h-5 w-5 text-yellow-500" />
            )}
            {item.slaStatus === 'on_time' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
