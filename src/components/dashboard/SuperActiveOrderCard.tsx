import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import {
  Clock,
  MapPin,
  User,
  Wrench,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceFlow, getCurrentStepIndex } from '@/utils/serviceFlowUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NextStatusButton from '@/components/ServiceOrders/ProgressTracker/NextStatusButton';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import { translateStatus } from '@/utils/statusMapping';
import { cardPresets, cardText, cardSurface, getOrderStatusClasses } from '@/lib/cardStyles';
import { formatUTCStringAsLocal } from '@/utils/timezoneUtils';

interface SuperActiveOrderCardProps {
  orders: ServiceOrder[];
  onViewOrder?: (orderId: string) => void;
  onNavigate?: (address: string) => void;
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus, notes?: string) => Promise<void>;
  onOpenProgressModal?: (order: ServiceOrder) => void;
  className?: string;
}

const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    'scheduled': 'border-blue-200',
    'on_the_way': 'border-yellow-200',
    'in_progress': 'border-green-200',
    'collected': 'border-purple-200',
    'at_workshop': 'border-orange-200',
    'completed': 'border-emerald-200',
    'cancelled': 'border-red-200'
  };
  return statusColors[status] || 'border-gray-200';
};

const getStatusBgColor = (status: string) => {
  const statusBgColors: Record<string, string> = {
    'scheduled': 'bg-blue-50/80 dark:bg-blue-950/20',
    'on_the_way': 'bg-yellow-50/80 dark:bg-yellow-950/20',
    'in_progress': 'bg-green-50/80 dark:bg-green-950/20',
    'collected': 'bg-purple-50/80 dark:bg-purple-950/20',
    'at_workshop': 'bg-orange-50/80 dark:bg-orange-950/20',
    'completed': 'bg-emerald-50/80 dark:bg-emerald-950/20',
    'cancelled': 'bg-red-50/80 dark:bg-red-950/20'
  };
  return statusBgColors[status] || 'bg-gray-50/80 dark:bg-gray-950/20';
};

const getProgressColor = (progress: number) => {
  if (progress < 30) return 'bg-red-500';
  if (progress < 60) return 'bg-yellow-500';
  if (progress < 90) return 'bg-blue-500';
  return 'bg-green-500';
};

const isOrderOverdue = (order: ServiceOrder): boolean => {
  if (!order.scheduledDate) return false;

  const now = new Date();
  const scheduledDateTime = new Date(order.scheduledDate);

  // Se tem horário específico, usar ele
  if (order.scheduledTime) {
    const [hours, minutes] = order.scheduledTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
  }

  // Considerar atrasado se passou mais de 1 hora do horário agendado
  const oneHourLater = new Date(scheduledDateTime.getTime() + 60 * 60 * 1000);
  return now > oneHourLater;
};

const getOrderPriority = (order: ServiceOrder): number => {
  // Prioridade baseada em status e urgência - ESPECÍFICA PARA TÉCNICO
  const statusPriority: Record<string, number> = {
    'in_progress': 1,      // Mais alta prioridade
    'on_the_way': 2,
    'scheduled': 3,        // Agendado tem prioridade alta
    'pending': 4,
    'collected': 100,      // Coletado vai para o final (baixa prioridade)
    'at_workshop': 101,
    'completed': 200,
    'cancelled': 201
  };

  let priority = statusPriority[order.status] || 999;

  // Penalizar ordens atrasadas (mas não tanto quanto coletadas)
  if (isOrderOverdue(order)) {
    priority += 50; // Penalizar, mas menos que ordens coletadas
  }

  return priority;
};

export const SuperActiveOrderCard: React.FC<SuperActiveOrderCardProps> = ({
  orders,
  onViewOrder,
  onNavigate,
  onUpdateStatus,
  onOpenProgressModal,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [correctScheduledTimes, setCorrectScheduledTimes] = useState<Record<string, string>>({});

  // 🎯 NOVA ARQUITETURA: Buscar horários corretos de calendar_events (fonte única da verdade)
  useEffect(() => {
    const fetchCorrectTimes = async () => {
      console.log('🕐 [SuperActiveOrderCard] Iniciando busca de horários corretos...');
      const times: Record<string, string> = {};

      for (const order of orders) {
        try {
          console.log(`🔍 [SuperActiveOrderCard] Buscando horário para ${order.clientName} (${order.id.substring(0, 8)})`);

          // 🎯 NOVA FONTE: Buscar em scheduled_services (mesma fonte do MainCalendarView)
          const { data, error } = await supabase
            .from('scheduled_services')
            .select('scheduled_start_time')
            .eq('service_order_id', order.id)
            .single();

          if (!error && data?.scheduled_start_time) {
            const correctedTime = formatUTCStringAsLocal(data.scheduled_start_time, 'HH:mm');
            times[order.id] = correctedTime;
            console.log(`✅ [SuperActiveOrderCard] ${order.clientName}: Horário correto encontrado em scheduled_services: ${correctedTime}`);
          } else {
            console.log(`⚠️ [SuperActiveOrderCard] ${order.clientName}: Não encontrado em scheduled_services, tentando calendar_events`);

            // Fallback para calendar_events
            const { data: calendarData, error: calendarError } = await supabase
              .from('calendar_events')
              .select('start_time')
              .eq('service_order_id', order.id)
              .single();

            if (!calendarError && calendarData?.start_time) {
              const correctedTime = formatUTCStringAsLocal(calendarData.start_time, 'HH:mm');
              times[order.id] = correctedTime;
              console.log(`✅ [SuperActiveOrderCard] ${order.clientName}: Horário correto encontrado em calendar_events: ${correctedTime}`);
            } else if (order.scheduledDate) {
              const fallbackTime = format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR });
              times[order.id] = fallbackTime;
              console.log(`📅 [SuperActiveOrderCard] ${order.clientName}: Usando fallback final: ${fallbackTime}`);
            }
          }
        } catch (error) {
          console.error(`❌ [SuperActiveOrderCard] Erro ao buscar horário para ${order.clientName}:`, error);
          if (order.scheduledDate) {
            const fallbackTime = format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR });
            times[order.id] = fallbackTime;
            console.log(`🔄 [SuperActiveOrderCard] ${order.clientName}: Fallback após erro: ${fallbackTime}`);
          }
        }
      }

      console.log('🎯 [SuperActiveOrderCard] Horários finais:', times);
      setCorrectScheduledTimes(times);
    };

    if (orders.length > 0) {
      console.log(`🚀 [SuperActiveOrderCard] Processando ${orders.length} ordens`);
      fetchCorrectTimes();
    } else {
      console.log('⚠️ [SuperActiveOrderCard] Nenhuma ordem para processar');
    }
  }, [orders]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  if (!orders || orders.length === 0) {
    return (
      <Card className={cn('transition-all duration-300', className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="w-5 h-5 text-muted-foreground" />
            Ordens Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Wrench className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nenhuma ordem ativa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Todas as ordens foram concluídas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrar e ordenar ordens por prioridade inteligente
  const sortedOrders = [...orders]
    .sort((a, b) => {
      const priorityA = getOrderPriority(a);
      const priorityB = getOrderPriority(b);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Se mesma prioridade, ordenar por horário agendado
      if (a.scheduledDate && b.scheduledDate) {
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      }

      return 0;
    });

  // Separar ordens atrasadas das atuais (para indicação visual)
  const currentOrders = sortedOrders.filter(order => !isOrderOverdue(order));
  const overdueOrders = sortedOrders.filter(order => isOrderOverdue(order));

  // 🔧 CORREÇÃO: Incluir TODAS as ordens ativas (atuais + atrasadas) no agrupamento
  const allActiveOrders = [...currentOrders, ...overdueOrders];

  const groupedOrders = allActiveOrders.reduce((acc, order) => {
    const key = `${order.clientName}-${order.pickupAddress || 'Sem endereço'}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(order);
    return acc;
  }, {} as Record<string, ServiceOrder[]>);

  // 🔧 CORREÇÃO: Pegar a primeira ordem de TODAS as ativas (incluindo atrasadas)
  const primaryOrder = sortedOrders[0]; // Usar a primeira da lista ordenada por prioridade
  const primaryGroup = primaryOrder ? groupedOrders[`${primaryOrder.clientName}-${primaryOrder.pickupAddress || 'Sem endereço'}`] || [primaryOrder] : [];

  const hasMultipleGroups = Object.keys(groupedOrders).length > 1;
  const hasMultipleOrders = allActiveOrders.length > 1; // 🔧 Usar todas as ordens ativas
  const hasOverdueOrders = overdueOrders.length > 0;

  // Calcular progresso geral (apenas ordens atuais, não atrasadas)
  const totalProgress = currentOrders.reduce((sum, order) => {
    const attendanceType = order.serviceAttendanceType || "em_domicilio";
    const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
      ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
      : "em_domicilio";

    const serviceFlow = getServiceFlow(validType);
    const currentStepIndex = getCurrentStepIndex(order.status, validType);
    return sum + (serviceFlow.length > 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0);
  }, 0);

  const averageProgress = currentOrders.length > 0 ? totalProgress / currentOrders.length : 0;

  // 🔧 CORREÇÃO: Usar horário correto de scheduled_services
  const scheduledTime = correctScheduledTimes[primaryOrder.id] || null;

  // Função para gerar link do WhatsApp
  const getWhatsAppLink = (phone: string) => {
    // Remover caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Adicionar código do país se não tiver
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${formattedPhone}`;
  };

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-lg border-l-4 overflow-hidden cursor-pointer',
        getStatusColor(primaryOrder.status),
        className
      )}
      onClick={() => onOpenProgressModal?.(primaryOrder)}
    >
      {/* Header Responsivo */}
      <div className={cn(
        'px-4 sm:px-6 py-3 sm:py-4 border-b',
        getStatusBgColor(primaryOrder.status)
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-base text-gray-900">
                {hasMultipleOrders ? `${allActiveOrders.length} Ordens Ativas` : 'Ordem Ativa'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <Badge variant="outline" className="text-xs sm:text-sm bg-blue-50 text-blue-700 border-blue-200 mobile-badge">
                Hoje
              </Badge>

              {allActiveOrders.length > 0 && (
                <Badge variant="secondary" className="bg-[#e5b034]/20 text-[#e5b034] border-[#e5b034]/30 text-xs sm:text-sm mobile-badge">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden xs:inline">{allActiveOrders.length} equipamento{allActiveOrders.length > 1 ? 's' : ''}</span>
                  <span className="xs:hidden">{allActiveOrders.length} equip.</span>
                </Badge>
              )}

              {hasOverdueOrders && (
                <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 text-xs sm:text-sm mobile-badge">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden xs:inline">{overdueOrders.length} atrasada{overdueOrders.length > 1 ? 's' : ''}</span>
                  <span className="xs:hidden">{overdueOrders.length} atr.</span>
                </Badge>
              )}
            </div>
          </div>

          <Badge
            variant="secondary"
            className={cn(
              "bg-white/70 border text-xs sm:text-sm mobile-badge self-start sm:self-auto",
              isOrderOverdue(primaryOrder) ? "text-red-700 border-red-200" : "text-gray-700 border-gray-200"
            )}
          >
            {translateStatus(primaryOrder.status)}
            {isOrderOverdue(primaryOrder) && (
              <span className="hidden sm:inline"> (Atrasada)</span>
            )}
          </Badge>
        </div>
      </div>

      {/* Conteúdo Principal Integrado */}
      <div className="p-6 space-y-6">
        {/* Informações do Equipamento e Cliente - Layout Responsivo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Coluna 1: Equipamento e Problema */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-[#e5b034] flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-base sm:text-lg text-gray-900 break-words">
                  {primaryOrder.equipmentType}
                  {primaryOrder.equipmentModel && ` - ${primaryOrder.equipmentModel}`}
                </div>
                <Badge variant="secondary" className="text-xs sm:text-sm mt-1 mobile-badge">
                  {primaryOrder.serviceAttendanceType === 'em_domicilio' && '🏠 Em Domicílio'}
                  {primaryOrder.serviceAttendanceType === 'coleta_diagnostico' && '🔍 Coleta p/ Diagnóstico'}
                  {primaryOrder.serviceAttendanceType === 'coleta_conserto' && '🔧 Coleta p/ Conserto'}
                </Badge>
              </div>
            </div>

            {primaryOrder.description && (
              <div className="bg-gray-50 p-3 rounded-lg border">
                <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Problema Relatado:</div>
                <div className="text-sm sm:text-base text-gray-800 break-words">{primaryOrder.description}</div>
              </div>
            )}

            {hasMultipleOrders && (
              <div className="text-xs sm:text-sm text-muted-foreground">
                + {allActiveOrders.length - 1} equipamento{allActiveOrders.length > 2 ? 's' : ''} adicional{allActiveOrders.length > 2 ? 'is' : ''}
              </div>
            )}
          </div>

          {/* Coluna 2: Cliente e Contato */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-base sm:text-lg text-gray-900 break-words">{primaryOrder.clientName}</div>
                {primaryOrder.clientPhone && (
                  <a
                    href={getWhatsAppLink(primaryOrder.clientPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="break-all">{primaryOrder.clientPhone}</span>
                  </a>
                )}
              </div>
            </div>

            {primaryOrder.pickupAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base text-gray-600 break-words">
                  {primaryOrder.pickupAddress}
                </span>
              </div>
            )}

            {scheduledTime && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm sm:text-base font-medium">{scheduledTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Ação Principal */}
        {onUpdateStatus && (
          <div
            className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-blue-800 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Avançar para Próxima Etapa
            </div>
            <NextStatusButton
              serviceOrder={primaryOrder}
              onUpdateStatus={async (orderId: string, newStatus: string, notes?: string) => {
                await onUpdateStatus(orderId, newStatus as ServiceOrderStatus, notes);
                return true;
              }}
              relatedOrders={orders.filter(o => o.id !== primaryOrder.id)}
            />
          </div>
        )}

        {/* Progresso */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-base font-medium">Progresso Geral</span>
            <span className="text-base text-muted-foreground">
              {Math.round(averageProgress)}% concluído
            </span>
          </div>
          <div className="relative">
            <Progress value={averageProgress} className="h-4" />
            <div
              className={cn(
                "absolute top-0 left-0 h-4 rounded-full transition-all duration-500",
                getProgressColor(averageProgress)
              )}
              style={{ width: `${averageProgress}%` }}
            />
          </div>
        </div>

        {/* Equipamentos Adicionais - Versão Simplificada */}
        {hasMultipleOrders && !isExpanded && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-medium text-gray-700">
                Outros Equipamentos ({allActiveOrders.length - 1})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
                className="text-sm"
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                Ver Todos
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {allActiveOrders.slice(1, 3).map((order) => (
                <div key={order.id} className={cn(cardSurface.elevated, "flex items-center justify-between p-3 rounded border")}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Wrench className="w-4 h-4 text-[#e5b034] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className={cn("text-base truncate", cardText.primary)}>
                        {order.equipmentType} - {order.clientName}
                      </div>
                      {order.description && (
                        <div className={cn("text-xs truncate", cardText.secondary)}>
                          {order.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {translateStatus(order.status)}
                  </Badge>
                </div>
              ))}

              {allActiveOrders.length > 3 && (
                <div className="text-sm text-center text-muted-foreground py-2">
                  +{allActiveOrders.length - 3} equipamentos adicionais
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botão para Ver Todos os Detalhes */}
        {hasMultipleOrders && !isExpanded && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            variant="outline"
            size="sm"
            className="w-full border-[#e5b034] text-[#e5b034] hover:bg-[#e5b034]/10 text-base py-3"
          >
            <Package className="w-5 h-5 mr-2" />
            Ver Todos os {allActiveOrders.length} Equipamentos
            </Button>
        )}

        {/* Vista Expandida - Simplificada */}
        {isExpanded && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">Todos os Equipamentos ({allActiveOrders.length})</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="text-sm"
              >
                <ChevronUp className="w-4 h-4 mr-1" />
                Recolher
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {allActiveOrders.map((order) => (
                <div key={order.id} className={cn(cardSurface.elevated, "flex items-center justify-between p-4 rounded border")}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Wrench className="w-5 h-5 text-[#e5b034] flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-medium text-base truncate", cardText.primary)}>
                        {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                      </div>
                      <div className={cn("text-sm truncate", cardText.secondary)}>
                        Cliente: {order.clientName}
                      </div>
                      {order.description && (
                        <div className={cn("text-xs truncate mt-1", cardText.muted)}>
                          Problema: {order.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {order.clientPhone && (
                      <a
                        href={getWhatsAppLink(order.clientPhone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-green-600 hover:text-green-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <Badge variant="outline" className="text-sm">
                      {translateStatus(order.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
