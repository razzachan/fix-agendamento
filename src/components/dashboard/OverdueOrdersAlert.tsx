import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceOrder } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  Clock,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  Phone,
  Navigation,
  MessageCircle,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { translateStatus } from '@/utils/statusMapping';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromServiceOrder } from '@/utils/addressFormatter';
import { formatUTCStringAsLocal } from '@/utils/timezoneUtils';

interface OverdueOrdersAlertProps {
  overdueOrders: ServiceOrder[];
  onNavigate?: (address: string) => void;
  onCallClient?: (phone: string) => void;
  onViewOrder?: (orderId: string) => void;
  onOpenProgress?: (order: ServiceOrder) => void;
  className?: string;
}

// Função para gerar link do WhatsApp
const generateWhatsAppLink = (phone: string, orderInfo?: { clientName: string; equipmentType: string; orderNumber?: string }) => {
  // Remove formatação do telefone
  const cleanPhone = phone.replace(/\D/g, '');

  // Monta a mensagem
  let message = 'Olá! Sou técnico da Fix Fogões.';

  if (orderInfo) {
    message += ` Estou entrando em contato sobre o serviço agendado para ${orderInfo.equipmentType}`;
    if (orderInfo.orderNumber) {
      message += ` (OS #${orderInfo.orderNumber})`;
    }
    message += '.';
  } else {
    message += ' Estou entrando em contato sobre seu serviço agendado.';
  }

  return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
};

const getDelayLevel = (order: ServiceOrder): 'mild' | 'moderate' | 'severe' => {
  if (!order.scheduledDate) return 'mild';

  const now = new Date();
  const scheduledDateTime = new Date(order.scheduledDate);

  if (order.scheduledTime) {
    const [hours, minutes] = order.scheduledTime.split(':').map(Number);
    scheduledDateTime.setHours(hours, minutes, 0, 0);
  }

  const hoursLate = (now.getTime() - scheduledDateTime.getTime()) / (1000 * 60 * 60);

  if (hoursLate > 4) return 'severe';
  if (hoursLate > 2) return 'moderate';
  return 'mild';
};

const getDelayColor = (level: 'mild' | 'moderate' | 'severe') => {
  switch (level) {
    case 'severe': return 'bg-red-500 dark:bg-red-600 text-white border-red-600 dark:border-red-700';
    case 'moderate': return 'bg-orange-500 dark:bg-orange-600 text-white border-orange-600 dark:border-orange-700';
    case 'mild': return 'bg-yellow-500 dark:bg-yellow-600 text-white border-yellow-600 dark:border-yellow-700';
  }
};

// 🎯 CORREÇÃO: Buscar horário correto de scheduled_services (MainCalendarView como fonte única da verdade)
const getCorrectScheduledTime = async (order: ServiceOrder): Promise<string> => {
  try {
    console.log(`🔍 [getCorrectScheduledTime] Buscando horário para ${order.clientName} (${order.id.substring(0, 8)})`);

    // 🎯 NOVA FONTE: Buscar em scheduled_services (mesma fonte do MainCalendarView)
    const { data, error } = await supabase
      .from('scheduled_services')
      .select('scheduled_start_time')
      .eq('service_order_id', order.id)
      .single();

    if (!error && data?.scheduled_start_time) {
      const correctedTime = formatUTCStringAsLocal(data.scheduled_start_time, 'HH:mm');
      console.log(`✅ [getCorrectScheduledTime] ${order.clientName}: Encontrado em scheduled_services: ${correctedTime}`);
      return correctedTime;
    } else {
      console.log(`⚠️ [getCorrectScheduledTime] ${order.clientName}: Não encontrado em scheduled_services, tentando calendar_events`);

      // Fallback para calendar_events
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendar_events')
        .select('start_time')
        .eq('service_order_id', order.id)
        .single();

      if (!calendarError && calendarData?.start_time) {
        const correctedTime = formatUTCStringAsLocal(calendarData.start_time, 'HH:mm');
        console.log(`✅ [getCorrectScheduledTime] ${order.clientName}: Encontrado em calendar_events: ${correctedTime}`);
        return correctedTime;
      }
    }
  } catch (error) {
    console.error(`❌ [getCorrectScheduledTime] Erro para ${order.clientName}:`, error);
  }

  // Fallback final para service_orders.scheduledDate
  if (order.scheduledDate) {
    const fallbackTime = format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR });
    console.log(`📅 [getCorrectScheduledTime] ${order.clientName}: Usando fallback final: ${fallbackTime}`);
    return fallbackTime;
  }

  console.log(`❌ [getCorrectScheduledTime] ${order.clientName}: Nenhum horário disponível`);
  return 'Horário não disponível';
};

const OverdueOrdersAlert: React.FC<OverdueOrdersAlertProps> = ({
  overdueOrders,
  onNavigate,
  onCallClient,
  onViewOrder,
  onOpenProgress,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [correctTimes, setCorrectTimes] = useState<Record<string, string>>({});

  // 🔧 CORREÇÃO: Buscar horários corretos para todas as ordens
  useEffect(() => {
    const fetchCorrectTimes = async () => {
      const times: Record<string, string> = {};

      for (const order of overdueOrders) {
        times[order.id] = await getCorrectScheduledTime(order);
      }

      setCorrectTimes(times);
    };

    if (overdueOrders.length > 0) {
      fetchCorrectTimes();
    }
  }, [overdueOrders]);

  if (!overdueOrders || overdueOrders.length === 0) {
    return null;
  }

  // Agrupar por nível de atraso
  const severeDelays = overdueOrders.filter(order => getDelayLevel(order) === 'severe');
  const moderateDelays = overdueOrders.filter(order => getDelayLevel(order) === 'moderate');
  const mildDelays = overdueOrders.filter(order => getDelayLevel(order) === 'mild');

  const mostUrgentOrder = severeDelays[0] || moderateDelays[0] || mildDelays[0];

  return (
    <Card className={cn('border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20', className)}>
      <CardHeader className="pb-3 px-4 sm:px-6">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm sm:text-base text-red-800 dark:text-red-200 truncate">
              <span className="hidden xs:inline">
                {overdueOrders.length} Ordem{overdueOrders.length > 1 ? 's' : ''} Atrasada{overdueOrders.length > 1 ? 's' : ''}
              </span>
              <span className="xs:hidden">
                {overdueOrders.length} Atrasada{overdueOrders.length > 1 ? 's' : ''}
              </span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1 flex-shrink-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 px-4 sm:px-6">
        {/* Resumo de Severidade */}
        <div className="flex flex-wrap gap-1 sm:gap-2">
          {severeDelays.length > 0 && (
            <Badge className={cn(getDelayColor('severe'), 'text-xs sm:text-sm')}>
              <span className="hidden xs:inline">{severeDelays.length} Crítica{severeDelays.length > 1 ? 's' : ''}</span>
              <span className="xs:hidden">{severeDelays.length} Crít.</span>
            </Badge>
          )}
          {moderateDelays.length > 0 && (
            <Badge className={cn(getDelayColor('moderate'), 'text-xs sm:text-sm')}>
              <span className="hidden xs:inline">{moderateDelays.length} Moderada{moderateDelays.length > 1 ? 's' : ''}</span>
              <span className="xs:hidden">{moderateDelays.length} Mod.</span>
            </Badge>
          )}
          {mildDelays.length > 0 && (
            <Badge className={cn(getDelayColor('mild'), 'text-xs sm:text-sm')}>
              <span className="hidden xs:inline">{mildDelays.length} Leve{mildDelays.length > 1 ? 's' : ''}</span>
              <span className="xs:hidden">{mildDelays.length} Lev.</span>
            </Badge>
          )}
        </div>

        {/* Ordem Mais Urgente */}
        <div className="p-3 bg-white border border-red-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-800">Mais Urgente:</span>
            <Badge className={getDelayColor(getDelayLevel(mostUrgentOrder))}>
              {getDelayLevel(mostUrgentOrder) === 'severe' ? 'CRÍTICO' : 
               getDelayLevel(mostUrgentOrder) === 'moderate' ? 'MODERADO' : 'LEVE'}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#e5b034]" />
              <span className="font-semibold">{mostUrgentOrder.equipmentType}</span>
            </div>

            {mostUrgentOrder.description && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                <span className="font-medium">Problema:</span> {mostUrgentOrder.description}
              </div>
            )}

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold">{mostUrgentOrder.clientName}</span>
            </div>

            <AddressDisplay
              data={extractAddressFromServiceOrder(mostUrgentOrder)}
              variant="compact"
              className="text-sm text-muted-foreground"
              iconClassName="w-4 h-4 text-muted-foreground"
            />

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">
                Agendado: {correctTimes[mostUrgentOrder.id] || 'Carregando...'}
              </span>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex flex-wrap gap-2 mt-3">
            {onOpenProgress && (
              <Button
                onClick={() => onOpenProgress(mostUrgentOrder)}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
              >
                <Navigation className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">Ir Agora</span>
                <span className="xs:hidden">Ir</span>
              </Button>
            )}

            {onCallClient && mostUrgentOrder.clientPhone && (
              <Button
                onClick={() => onCallClient(mostUrgentOrder.clientPhone)}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50 flex-shrink-0"
              >
                <Phone className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">Ligar</span>
                <span className="xs:hidden">Tel</span>
              </Button>
            )}

            {mostUrgentOrder.clientPhone && (
              <Button
                onClick={() => {
                  const whatsappLink = generateWhatsAppLink(mostUrgentOrder.clientPhone, {
                    clientName: mostUrgentOrder.clientName,
                    equipmentType: mostUrgentOrder.equipmentType,
                    orderNumber: mostUrgentOrder.orderNumber
                  });
                  window.open(whatsappLink, '_blank');
                }}
                variant="outline"
                size="sm"
                className="border-green-200 text-green-700 hover:bg-green-50 flex-shrink-0"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                <span className="hidden xs:inline">WhatsApp</span>
                <span className="xs:hidden">Wi</span>
              </Button>
            )}
          </div>
        </div>

        {/* Lista Expandida */}
        {isExpanded && overdueOrders.length > 1 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-red-800">Todas as Ordens Atrasadas:</div>
            {overdueOrders.slice(1).map((order) => {
              const delayLevel = getDelayLevel(order);
              const scheduledTime = correctTimes[order.id];

              return (
                <div
                  key={order.id}
                  className="p-2 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-800 rounded cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => onViewOrder?.(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{order.equipmentType}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>Cliente: {order.clientName}</span>
                        <DisplayNumber item={order} variant="inline" size="sm" showIcon={false} />
                        {scheduledTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {scheduledTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={cn('text-xs', getDelayColor(delayLevel))}>
                      {translateStatus(order.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OverdueOrdersAlert;
