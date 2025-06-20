import React, { useState } from 'react';
import { ServiceOrder } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  ChevronRight, 
  Users, 
  Package, 
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { getServiceFlow, getCurrentStepIndex, getNextStatus } from '@/utils/serviceFlowUtils';
import { translateStatus } from '@/utils/translations';

interface ProgressionOption {
  type: 'individual' | 'batch' | 'selective';
  label: string;
  description: string;
  orders: ServiceOrder[];
  nextStatus: string;
  icon: React.ReactNode;
}

interface ProgressionManagerProps {
  orders: ServiceOrder[];
  onUpdateStatus: (orderId: string, status: string) => Promise<boolean>;
  trigger: React.ReactNode;
  context: 'grouped' | 'individual';
}

export const ProgressionManager: React.FC<ProgressionManagerProps> = ({
  orders,
  onUpdateStatus,
  trigger,
  context
}) => {
  console.log('🎯 ProgressionManager renderizado:', { ordersCount: orders.length, context });
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProgressionOption | null>(null);

  // Analisar as ordens para determinar opções de progressão
  const analyzeProgressionOptions = (): ProgressionOption[] => {
    const options: ProgressionOption[] = [];
    
    // Agrupar por status atual e próximo status
    const statusGroups = orders.reduce((groups, order) => {
      const attendanceType = order.serviceAttendanceType || 'em_domicilio';
      const nextStatus = getNextStatus(order.status, attendanceType as any);
      
      if (!nextStatus) return groups;
      
      const key = `${order.status}-${nextStatus}`;
      if (!groups[key]) {
        groups[key] = {
          currentStatus: order.status,
          nextStatus,
          orders: []
        };
      }
      groups[key].orders.push(order);
      return groups;
    }, {} as Record<string, { currentStatus: string; nextStatus: string; orders: ServiceOrder[] }>);

    // Opção 1: Progressão individual (sempre disponível)
    if (orders.length === 1) {
      const order = orders[0];
      const attendanceType = order.serviceAttendanceType || 'em_domicilio';
      const nextStatus = getNextStatus(order.status, attendanceType as any);
      
      if (nextStatus) {
        options.push({
          type: 'individual',
          label: 'Avançar Equipamento',
          description: `${order.equipmentType} → ${translateStatus(nextStatus)}`,
          orders: [order],
          nextStatus,
          icon: <Package className="h-4 w-4" />
        });
      }
    }

    // Opção 2: Progressão em lote (quando múltiplas OSs têm mesmo status/próximo)
    Object.values(statusGroups).forEach(group => {
      if (group.orders.length > 1) {
        options.push({
          type: 'batch',
          label: `Avançar ${group.orders.length} Equipamentos`,
          description: `Todos de "${translateStatus(group.currentStatus)}" → "${translateStatus(group.nextStatus)}"`,
          orders: group.orders,
          nextStatus: group.nextStatus,
          icon: <Users className="h-4 w-4" />
        });
      }
    });

    // Opção 3: Progressão seletiva (quando há múltiplas OSs com status diferentes)
    if (orders.length > 1 && Object.keys(statusGroups).length > 1) {
      const readyToAdvance = orders.filter(order => {
        const attendanceType = order.serviceAttendanceType || 'em_domicilio';
        return getNextStatus(order.status, attendanceType as any) !== null;
      });

      if (readyToAdvance.length > 0) {
        options.push({
          type: 'selective',
          label: 'Progressão Seletiva',
          description: `Escolher quais dos ${readyToAdvance.length} equipamentos avançar`,
          orders: readyToAdvance,
          nextStatus: '', // Será definido na seleção
          icon: <CheckCircle2 className="h-4 w-4" />
        });
      }
    }

    return options;
  };

  const progressionOptions = analyzeProgressionOptions();

  // Executar progressão baseada na opção selecionada
  const executeProgression = async (option: ProgressionOption) => {
    setIsProcessing(true);
    
    try {
      if (option.type === 'individual' || option.type === 'batch') {
        // Progressão direta
        const promises = option.orders.map(order => 
          onUpdateStatus(order.id, option.nextStatus)
        );
        
        const results = await Promise.all(promises);
        const successCount = results.filter(Boolean).length;
        
        if (successCount === option.orders.length) {
          console.log(`✅ Progressão ${option.type} concluída: ${successCount} ordens atualizadas`);
        } else {
          console.warn(`⚠️ Progressão parcial: ${successCount}/${option.orders.length} ordens atualizadas`);
        }
      } else if (option.type === 'selective') {
        // TODO: Implementar interface de seleção individual
        console.log('🎯 Progressão seletiva - implementar interface de seleção');
      }
      
      setIsOpen(false);
      setSelectedOption(null);
    } catch (error) {
      console.error('❌ Erro na progressão:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Se não há opções de progressão, não renderizar
  if (progressionOptions.length === 0) {
    return null;
  }

  // Se há apenas uma opção e é individual, executar diretamente
  if (progressionOptions.length === 1 && progressionOptions[0].type === 'individual') {
    console.log('🚀 ProgressionManager - Renderizando execução direta:', progressionOptions[0]);
    return (
      <div onClick={(e) => {
        console.log('🔥 ProgressionManager - Clique detectado! Executando progressão...');
        e.stopPropagation();
        executeProgression(progressionOptions[0]);
      }}>
        {trigger}
      </div>
    );
  }

  return (
    <>
      <div onClick={(e) => {
        e.stopPropagation();
        setIsOpen(true);
      }}>
        {trigger}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChevronRight className="h-5 w-5 text-[#e5b034]" />
              Avançar Progresso
            </DialogTitle>
            <DialogDescription>
              {context === 'grouped' 
                ? 'Escolha como avançar as ordens deste endereço:'
                : 'Escolha como avançar esta ordem:'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {progressionOptions.map((option, index) => (
              <div
                key={index}
                className={`border rounded-lg p-3 cursor-pointer transition-all hover:border-[#e5b034] hover:bg-[#e5b034]/5 ${
                  selectedOption === option ? 'border-[#e5b034] bg-[#e5b034]/10' : 'border-gray-200'
                }`}
                onClick={() => setSelectedOption(option)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-[#e5b034]">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{option.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{option.description}</div>
                    
                    {option.orders.length > 1 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {option.orders.length} equipamentos
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedOption && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => executeProgression(selectedOption)}
                disabled={isProcessing}
                className="flex-1 bg-[#e5b034] hover:bg-[#d4a02a]"
              >
                {isProcessing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Avançar
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProgressionManager;
