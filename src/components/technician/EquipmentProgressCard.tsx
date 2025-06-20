import React from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getServiceFlow, getCurrentStepIndex, getNextStatus } from '@/utils/serviceFlowUtils';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Wrench,
  Package,
  Home,
  Truck
} from 'lucide-react';

interface EquipmentProgressCardProps {
  order: ServiceOrder;
  equipment: {
    id: string;
    equipment: string;
    serviceAttendanceType: 'em_domicilio' | 'coleta_conserto' | 'coleta_diagnostico';
    status?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus: (newStatus: string) => Promise<void>;
}

export const EquipmentProgressCard: React.FC<EquipmentProgressCardProps> = ({
  order,
  equipment,
  isSelected,
  onSelect,
  onUpdateStatus
}) => {
  // Usar status individual do equipamento ou status da OS
  const currentStatus = equipment.status || order.status;
  const attendanceType = equipment.serviceAttendanceType;
  
  // Calcular progresso individual
  const serviceFlow = getServiceFlow(attendanceType);
  const currentStepIndex = getCurrentStepIndex(currentStatus, attendanceType);
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;
  const nextStatus = getNextStatus(currentStatus, attendanceType);
  
  // Obter configurações visuais
  const getStatusConfig = (status: string) => {
    const configs = {
      'scheduled': { color: 'blue', icon: Clock, label: 'Agendado' },
      'on_the_way': { color: 'indigo', icon: Truck, label: 'A Caminho' },
      'in_progress': { color: 'yellow', icon: Wrench, label: 'Em Andamento' },
      'collected': { color: 'purple', icon: Package, label: 'Coletado' },
      'at_workshop': { color: 'cyan', icon: Wrench, label: 'Na Oficina' },
      'completed': { color: 'green', icon: CheckCircle, label: 'Concluído' },
      'cancelled': { color: 'red', icon: AlertTriangle, label: 'Cancelado' }
    };
    return configs[status as keyof typeof configs] || configs.scheduled;
  };
  
  const getAttendanceTypeConfig = (type: string) => {
    const configs = {
      'em_domicilio': { label: 'Em Domicílio', color: 'bg-blue-100 text-blue-800', icon: Home },
      'coleta_conserto': { label: 'Coleta Conserto', color: 'bg-green-100 text-green-800', icon: Package },
      'coleta_diagnostico': { label: 'Coleta Diagnóstico', color: 'bg-yellow-100 text-yellow-800', icon: Package }
    };
    return configs[type as keyof typeof configs] || configs.em_domicilio;
  };
  
  const statusConfig = getStatusConfig(currentStatus);
  const attendanceConfig = getAttendanceTypeConfig(attendanceType);
  const StatusIcon = statusConfig.icon;
  const AttendanceIcon = attendanceConfig.icon;
  
  const isCompleted = currentStatus === 'completed';
  const isCancelled = currentStatus === 'cancelled';
  const canAdvance = nextStatus && !isCompleted && !isCancelled;
  
  const handleAdvanceStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextStatus) {
      await onUpdateStatus(nextStatus);
    }
  };

  return (
    <Card 
      className={`transition-all duration-300 cursor-pointer hover:shadow-md ${
        isSelected ? 'ring-2 ring-[#e5b034] ring-offset-2' : ''
      } ${
        equipment.priority === 'high' ? 'border-red-300' : 'border-gray-200'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 text-${statusConfig.color}-600`} />
            <span className="font-medium text-sm">{equipment.equipment}</span>
            {equipment.priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                Urgente
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <AttendanceIcon className="h-3 w-3" />
            <Badge variant="outline" className={`text-xs ${attendanceConfig.color}`}>
              {attendanceConfig.label}
            </Badge>
          </div>
        </div>
        
        {/* Status atual */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600">Status:</span>
          <Badge variant="secondary" className="text-xs">
            {statusConfig.label}
          </Badge>
        </div>
        
        {/* Barra de progresso */}
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        {/* Ações */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            OS #{order.id.substring(0, 8)}
          </div>
          
          {canAdvance && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAdvanceStatus}
              className="h-7 px-2 text-xs bg-[#e5b034] border-[#e5b034] text-white hover:bg-[#d4a02a]"
            >
              <ArrowRight className="h-3 w-3 mr-1" />
              Avançar
            </Button>
          )}
          
          {isCompleted && (
            <Badge variant="default" className="text-xs bg-green-600">
              <CheckCircle className="h-3 w-3 mr-1" />
              Concluído
            </Badge>
          )}
        </div>
        
        {/* Próximo status (preview) */}
        {nextStatus && !isCompleted && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Próximo: <span className="font-medium">{getStatusConfig(nextStatus).label}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EquipmentProgressCard;
