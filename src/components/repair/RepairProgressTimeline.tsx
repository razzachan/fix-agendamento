import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  Wrench, 
  Settings, 
  TestTube, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RepairEvent {
  type: string;
  description: any;
  created_at: string;
}

interface RepairProgressTimelineProps {
  serviceOrderId: string;
  refreshKey?: number;
  showTitle?: boolean;
  compact?: boolean;
  hideFinancialInfo?: boolean;
}

export function RepairProgressTimeline({
  serviceOrderId,
  refreshKey = 0,
  showTitle = true,
  compact = false,
  hideFinancialInfo = false
}: RepairProgressTimelineProps) {
  const [repairEvents, setRepairEvents] = useState<RepairEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);

  const loadRepairProgress = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_events')
        .select('type, description, created_at')
        .eq('service_order_id', serviceOrderId)
        .eq('type', 'repair')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar progresso do reparo:', error);
        return;
      }

      const events = (data || []).map(event => ({
        ...event,
        description: typeof event.description === 'string'
          ? JSON.parse(event.description)
          : event.description
      }));

      setRepairEvents(events);
    } catch (error) {
      console.error('❌ Erro ao processar eventos de reparo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRepairProgress();
  }, [serviceOrderId, refreshKey]);

  const getProgressIcon = (progressType: string) => {
    switch (progressType) {
      case 'started':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'parts_ordered':
        return <Package className="h-4 w-4 text-orange-600" />;
      case 'parts_received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disassembly':
        return <Settings className="h-4 w-4 text-purple-600" />;
      case 'repair_in_progress':
        return <Wrench className="h-4 w-4 text-yellow-600" />;
      case 'assembly':
        return <Settings className="h-4 w-4 text-blue-600" />;
      case 'testing':
        return <TestTube className="h-4 w-4 text-indigo-600" />;
      case 'quality_check':
        return <ShieldCheck className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getProgressLabel = (progressType: string) => {
    switch (progressType) {
      case 'started':
        return 'Reparo Iniciado';
      case 'parts_ordered':
        return 'Peças Solicitadas';
      case 'parts_received':
        return 'Peças Recebidas';
      case 'disassembly':
        return 'Desmontagem';
      case 'repair_in_progress':
        return 'Reparo em Andamento';
      case 'assembly':
        return 'Montagem';
      case 'testing':
        return 'Testes';
      case 'quality_check':
        return 'Controle de Qualidade';
      default:
        return progressType;
    }
  };

  const getProgressColor = (progressType: string) => {
    switch (progressType) {
      case 'started':
        return 'bg-blue-100 text-blue-800';
      case 'parts_ordered':
        return 'bg-orange-100 text-orange-800';
      case 'parts_received':
        return 'bg-green-100 text-green-800';
      case 'disassembly':
        return 'bg-purple-100 text-purple-800';
      case 'repair_in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'assembly':
        return 'bg-blue-100 text-blue-800';
      case 'testing':
        return 'bg-indigo-100 text-indigo-800';
      case 'quality_check':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true, locale: ptBR }),
      absolute: date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isCompleted = (event: RepairEvent) => {
    return event.description.completion_notes !== undefined;
  };

  if (isLoading) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5" />
              Progresso do Reparo
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-600">Carregando progresso...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (repairEvents.length === 0) {
    return (
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {showTitle && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5" />
              Progresso do Reparo
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-4">
            <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Nenhum progresso registrado ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastEvent = repairEvents[repairEvents.length - 1];
  const isRepairCompleted = isCompleted(lastEvent);

  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5" />
              Progresso do Reparo
              <Badge variant={isRepairCompleted ? 'default' : 'secondary'} className="ml-2">
                {repairEvents.length} {repairEvents.length === 1 ? 'etapa' : 'etapas'}
              </Badge>
            </CardTitle>
            
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        {compact && !isExpanded ? (
          // Versão compacta - dropdown com resumo visual
          <div className="space-y-3">
            {/* Resumo do último evento */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {getProgressIcon(lastEvent.description.progress_type || 'completed')}
                <div className="flex-1">
                  <Badge variant="secondary" className={getProgressColor(lastEvent.description.progress_type || 'completed')}>
                    {isRepairCompleted ? 'Concluído' : getProgressLabel(lastEvent.description.progress_type)}
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(lastEvent.created_at).relative}
                  </p>
                </div>
              </div>

              {/* Indicador de progresso */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: repairEvents.length }, (_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i === repairEvents.length - 1 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {repairEvents.length} {repairEvents.length === 1 ? 'etapa' : 'etapas'}
                </span>
              </div>
            </div>

            {/* Barra de progresso visual */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  isRepairCompleted ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min(100, (repairEvents.length / 4) * 100)}%`
                }}
              />
            </div>
          </div>
        ) : (
          // Versão expandida - timeline completa
          <div className="space-y-4">
            {repairEvents.map((event, index) => {
              const isLast = index === repairEvents.length - 1;
              const isEventCompleted = isCompleted(event);
              const progressType = event.description.progress_type;
              const notes = event.description.notes || event.description.completion_notes;
              const dateInfo = formatDate(event.created_at);

              return (
                <div key={index} className="relative">
                  {/* Linha conectora */}
                  {!isLast && (
                    <div className="absolute left-5 top-10 w-0.5 h-8 bg-gray-200"></div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    {/* Ícone */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {isEventCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        getProgressIcon(progressType)
                      )}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant="secondary" 
                          className={isEventCompleted ? 'bg-green-100 text-green-800' : getProgressColor(progressType)}
                        >
                          {isEventCompleted ? 'Reparo Concluído' : getProgressLabel(progressType)}
                        </Badge>
                        <span className="text-xs text-gray-500" title={dateInfo.absolute}>
                          {dateInfo.relative}
                        </span>
                      </div>
                      
                      {notes && (
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {notes}
                        </p>
                      )}
                      
                      {/* Informações adicionais para reparo concluído */}
                      {isEventCompleted && event.description.warranty_period && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Garantia:</span> {event.description.warranty_period} dias
                          {!hideFinancialInfo && event.description.final_cost && (
                            <span className="ml-3">
                              <span className="font-medium">Custo final:</span> R$ {event.description.final_cost.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
