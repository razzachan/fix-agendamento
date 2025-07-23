import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
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

interface SuperActiveOrderCardProps {
  orders: ServiceOrder[];
  onViewOrder?: (orderId: string) => void;
  onNavigate?: (address: string) => void;
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus, notes?: string) => Promise<void>;
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
    'scheduled': 'bg-blue-50/80',
    'on_the_way': 'bg-yellow-50/80',
    'in_progress': 'bg-green-50/80',
    'collected': 'bg-purple-50/80',
    'at_workshop': 'bg-orange-50/80',
    'completed': 'bg-emerald-50/80',
    'cancelled': 'bg-red-50/80'
  };
  return statusBgColors[status] || 'bg-gray-50/80';
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
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
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

  const scheduledTime = primaryOrder.scheduledDate 
    ? format(new Date(primaryOrder.scheduledDate), 'HH:mm', { locale: ptBR })
    : null;

  return (
    <Card className={cn(
      'transition-all duration-300 hover:shadow-lg border-l-4',
      getStatusColor(primaryOrder.status),
      getStatusBgColor(primaryOrder.status),
      className
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            <span>
              {hasMultipleOrders ? `${allActiveOrders.length} Ordens Ativas` : 'Ordem Ativa'}
            </span>
            {/* Indicador de filtro do dia atual */}
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              Hoje
            </Badge>
{(hasMultipleOrders || allActiveOrders.length > 0) && (
              <div className="flex gap-1">
                <Badge variant="secondary" className="bg-[#e5b034]/20 text-[#e5b034] border-[#e5b034]/30">
                  <Package className="w-3 h-3 mr-1" />
                  {allActiveOrders.length} equipamento{allActiveOrders.length > 1 ? 's' : ''}
                </Badge>
                {(hasMultipleOrders || allActiveOrders.length > 0) && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50 border-blue-200 text-blue-700"
                    onClick={() => setIsExpanded(true)}
                  >
                    👁️ Ver Detalhes
                  </Badge>
                )}
              </div>
            )}
            {hasOverdueOrders && (
              <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                <Clock className="w-3 h-3 mr-1" />
                {overdueOrders.length} atrasada{overdueOrders.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              "bg-white/70 border border-gray-200",
              isOrderOverdue(primaryOrder) ? "text-red-700 border-red-200" : "text-gray-700"
            )}
          >
            {translateStatus(primaryOrder.status)}
            {isOrderOverdue(primaryOrder) && " (Atrasada)"}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cliente, Telefone e Endereço Principal */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          {/* Nome do Cliente */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-900">{primaryOrder.clientName}</span>
          </div>

          {/* Telefone do Cliente */}
          {primaryOrder.clientPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <a
                href={`tel:${primaryOrder.clientPhone}`}
                className="text-sm font-medium text-green-600 hover:text-green-700 hover:underline cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {primaryOrder.clientPhone}
              </a>
            </div>
          )}

          {/* Endereço */}
          {primaryOrder.pickupAddress && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-600 mt-0.5" />
              <span className="text-sm text-gray-600">
                {primaryOrder.pickupAddress}
              </span>
            </div>
          )}
        </div>

        {/* 🔥 AÇÃO PRINCIPAL - POSIÇÃO PRIORITÁRIA */}
        {onUpdateStatus && (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
            <div className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              🚀 AÇÃO PRINCIPAL - {primaryOrder.equipmentType}
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

        {/* INFORMAÇÕES DO EQUIPAMENTO E PROBLEMA - DESTAQUE PRINCIPAL */}
        <div className="bg-[#e5b034]/10 border border-[#e5b034]/30 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#e5b034]" />
            <span className="font-semibold text-[#e5b034]">
              {hasMultipleOrders ? 'Equipamentos Principais' : 'Equipamento'}
            </span>
          </div>

          {/* Mostrar equipamento principal ou resumo */}
          <div className="space-y-2">
            <div className="font-medium text-sm">
              {primaryOrder.equipmentType}
              {primaryOrder.equipmentModel && ` - ${primaryOrder.equipmentModel}`}
            </div>

            {/* Tipo de Atendimento */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {primaryOrder.serviceAttendanceType === 'em_domicilio' && '🏠 Em Domicílio'}
                {primaryOrder.serviceAttendanceType === 'coleta_diagnostico' && '🔍 Coleta p/ Diagnóstico'}
                {primaryOrder.serviceAttendanceType === 'coleta_conserto' && '🔧 Coleta p/ Conserto'}
              </Badge>
            </div>

            {/* Problema/Descrição */}
            {primaryOrder.description && (
              <div className="bg-white/70 p-2 rounded border border-[#e5b034]/20">
                <div className="text-xs font-medium text-[#e5b034] mb-1">Problema Relatado:</div>
                <div className="text-sm text-gray-700">
                  {primaryOrder.description}
                </div>
              </div>
            )}

            {/* Se múltiplos equipamentos, mostrar resumo */}
            {hasMultipleOrders && (
              <div className="text-xs text-muted-foreground">
                + {allActiveOrders.length - 1} equipamento{allActiveOrders.length > 2 ? 's' : ''} adicional{allActiveOrders.length > 2 ? 'is' : ''}
                {hasOverdueOrders && ` (${overdueOrders.length} atrasado${overdueOrders.length > 1 ? 's' : ''})`}
              </div>
            )}
          </div>
        </div>

        {/* Horário agendado */}
        {scheduledTime && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">{scheduledTime}</span>
          </div>
        )}

        {/* Progresso Geral Melhorado */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(averageProgress)}% concluído
            </span>
          </div>

          <div className="relative">
            <Progress value={averageProgress} className="h-3" />
            <div
              className={cn(
                "absolute top-0 left-0 h-3 rounded-full transition-all duration-500",
                getProgressColor(averageProgress)
              )}
              style={{ width: `${averageProgress}%` }}
            />
          </div>

          {hasMultipleOrders && (
            <div className="text-xs text-muted-foreground text-center">
              {allActiveOrders.length} equipamentos ativos
              {hasOverdueOrders && ` • ${overdueOrders.length} atrasado${overdueOrders.length > 1 ? 's' : ''}`}
            </div>
          )}
        </div>

        {/* 🔹 DIVISÓRIA ELEGANTE - Separação Principal vs Outros */}
        {hasMultipleOrders && (
          <div className="flex items-center gap-3 py-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
              <Package className="w-3 h-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Outros Equipamentos</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300"></div>
          </div>
        )}

        {/* Resumo dos Equipamentos Adicionais (apenas se múltiplos) */}
        {hasMultipleOrders && !isExpanded && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Outros Equipamentos ({allActiveOrders.length - 1})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="h-auto p-1"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Lista Compacta dos Equipamentos Adicionais */}
            <div className="grid grid-cols-1 gap-2">
              {allActiveOrders.slice(1, 4).map((order, index) => {
                const attendanceType = order.serviceAttendanceType || "em_domicilio";
                const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
                  ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
                  : "em_domicilio";

                const serviceFlow = getServiceFlow(validType);
                const currentStepIndex = getCurrentStepIndex(order.status, validType);
                const orderProgress = serviceFlow.length > 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;

                return (
                  <div key={order.id} className="p-2 bg-white rounded border border-gray-200 hover:border-gray-300 cursor-pointer transition-all"
                       onClick={() => setIsExpanded(true)}>
                    {/* Cliente e Telefone */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <User className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-medium text-gray-900 truncate">
                          {order.clientName}
                        </span>
                      </div>
                      {order.clientPhone && (
                        <a
                          href={`tel:${order.clientPhone}`}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">
                        {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {translateStatus(order.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <DisplayNumber item={order} variant="inline" size="sm" showIcon={false} />
                      <span>{Math.round(orderProgress)}% concluído</span>
                    </div>
                    {/* Tipo de Atendimento */}
                    <div className="text-xs text-muted-foreground mb-1">
                      {order.serviceAttendanceType === 'em_domicilio' && '🏠 Em Domicílio'}
                      {order.serviceAttendanceType === 'coleta_diagnostico' && '🔍 Coleta p/ Diagnóstico'}
                      {order.serviceAttendanceType === 'coleta_conserto' && '🔧 Coleta p/ Conserto'}
                    </div>
                    {order.description && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        <strong>Problema:</strong> {order.description}
                      </div>
                    )}
                  </div>
                );
              })}

              {allActiveOrders.length > 4 && (
                <div className="text-xs text-muted-foreground text-center pt-1 cursor-pointer hover:text-blue-600"
                     onClick={() => setIsExpanded(true)}>
                  +{allActiveOrders.length - 4} equipamentos (clique para ver todos)
                </div>
              )}
            </div>

            {/* Botão Destacado para Ver Todos */}
            <Button
              onClick={() => setIsExpanded(true)}
              variant="outline"
              size="sm"
              className="w-full border-[#e5b034] text-[#e5b034] hover:bg-[#e5b034]/10"
            >
              <Package className="w-4 h-4 mr-2" />
              {hasMultipleOrders
                ? `Ver Todos os ${allActiveOrders.length} Equipamentos`
                : 'Ver Detalhes Completos'
              }
            </Button>

            {/* Mostrar ordens atrasadas separadamente */}
            {hasOverdueOrders && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-medium text-red-700 mb-1">Atrasadas:</div>
                {overdueOrders.slice(0, 2).map((order) => (
                  <div key={order.id} className="flex items-center justify-between text-xs text-red-600">
                    <span className="truncate">
                      {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                    </span>
                    <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                      {translateStatus(order.status)}
                    </Badge>
                  </div>
                ))}
                {overdueOrders.length > 2 && (
                  <div className="text-xs text-red-500 text-center pt-1">
                    +{overdueOrders.length - 2} atrasadas
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Vista Expandida - Detalhes de Todas as Ordens */}
        {isExpanded && (
          <div className="space-y-4">
            {/* 🔹 DIVISÓRIA EXPANDIDA - Detalhes Completos */}
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-300 to-blue-300"></div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full shadow-sm">
                <Package className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Detalhes dos Equipamentos</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-auto p-0.5 ml-1 hover:bg-blue-100"
                >
                  <ChevronUp className="w-3 h-3 text-blue-600" />
                </Button>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent via-blue-300 to-blue-300"></div>
            </div>

            {/* Ordens Atuais */}
            {currentOrders.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-green-700">Ordens Atuais</div>
                {currentOrders.map((order) => {
                const attendanceType = order.serviceAttendanceType || "em_domicilio";
                const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
                  ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
                  : "em_domicilio";

                const serviceFlow = getServiceFlow(validType);
                const currentStepIndex = getCurrentStepIndex(order.status, validType);
                const orderProgress = serviceFlow.length > 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all duration-200",
                      selectedOrderId === order.id
                        ? 'border-[#e5b034] bg-[#e5b034]/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    )}
                    onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                  >
                    <div className="space-y-2">
                      {/* Informações do Cliente */}
                      <div className="bg-gray-50 border border-gray-200 rounded p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">{order.clientName}</span>
                          </div>
                          {order.clientPhone && (
                            <a
                              href={`tel:${order.clientPhone}`}
                              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="w-3 h-3" />
                              <span className="text-xs">{order.clientPhone}</span>
                            </a>
                          )}
                        </div>
                        {order.pickupAddress && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 text-orange-600 mt-0.5" />
                            <span className="text-xs text-gray-600">{order.pickupAddress}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <DisplayNumber item={order} variant="inline" size="sm" showIcon={false} />
                            <span className="text-[#e5b034]">
                              {order.serviceAttendanceType === 'em_domicilio' && '🏠 Em Domicílio'}
                              {order.serviceAttendanceType === 'coleta_diagnostico' && '🔍 Coleta p/ Diagnóstico'}
                              {order.serviceAttendanceType === 'coleta_conserto' && '🔧 Coleta p/ Conserto'}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {translateStatus(order.status)}
                        </Badge>
                      </div>

                      {/* Problema/Descrição - DESTAQUE */}
                      {order.description && (
                        <div className="bg-[#e5b034]/10 border border-[#e5b034]/30 p-2 rounded">
                          <div className="text-xs font-medium text-[#e5b034] mb-1">Problema Relatado:</div>
                          <div className="text-sm text-gray-700">
                            {order.description}
                          </div>
                        </div>
                      )}

                      {/* Progresso Individual */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Progresso</span>
                          <span>{Math.round(orderProgress)}%</span>
                        </div>
                        <Progress value={orderProgress} className="h-1.5" />
                      </div>

                      {/* Ações de Progresso para Ordem Selecionada */}
                      {selectedOrderId === order.id && onUpdateStatus && (
                        <div className="pt-2 border-t">
                          <NextStatusButton
                            serviceOrder={order}
                            onUpdateStatus={async (orderId: string, newStatus: string, notes?: string) => {
                              await onUpdateStatus(orderId, newStatus as ServiceOrderStatus, notes);
                              return true;
                            }}
                            relatedOrders={orders.filter(o => o.id !== order.id)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}

            {/* Ordens Atrasadas */}
            {hasOverdueOrders && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Ordens Atrasadas ({overdueOrders.length})
                </div>
                {overdueOrders.map((order) => {
                  const attendanceType = order.serviceAttendanceType || "em_domicilio";
                  const validType = ["em_domicilio", "coleta_conserto", "coleta_diagnostico"].includes(attendanceType)
                    ? attendanceType as "em_domicilio" | "coleta_conserto" | "coleta_diagnostico"
                    : "em_domicilio";

                  const serviceFlow = getServiceFlow(validType);
                  const currentStepIndex = getCurrentStepIndex(order.status, validType);
                  const orderProgress = serviceFlow.length > 0 ? ((currentStepIndex + 1) / serviceFlow.length) * 100 : 0;

                  const scheduledTime = order.scheduledDate
                    ? format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR })
                    : null;

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        "p-3 border rounded-lg cursor-pointer transition-all duration-200 bg-red-50/50",
                        selectedOrderId === order.id
                          ? 'border-red-400 bg-red-100/50 shadow-sm'
                          : 'border-red-200 hover:border-red-300 hover:shadow-sm'
                      )}
                      onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-red-800">
                              {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                            </div>
                            <div className="text-xs text-red-600 flex items-center gap-2">
                              <DisplayNumber item={order} variant="inline" size="sm" showIcon={false} />
                              <span className="text-red-700">
                                {order.serviceAttendanceType === 'em_domicilio' && '🏠 Em Domicílio'}
                                {order.serviceAttendanceType === 'coleta_diagnostico' && '🔍 Coleta p/ Diagnóstico'}
                                {order.serviceAttendanceType === 'coleta_conserto' && '🔧 Coleta p/ Conserto'}
                              </span>
                              {scheduledTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Agendado: {scheduledTime}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs border-red-200 text-red-700">
                            {translateStatus(order.status)} (Atrasada)
                          </Badge>
                        </div>

                        {/* Problema/Descrição - DESTAQUE PARA ATRASADAS */}
                        {order.description && (
                          <div className="bg-red-100/70 border border-red-300/50 p-2 rounded">
                            <div className="text-xs font-medium text-red-700 mb-1">Problema Relatado:</div>
                            <div className="text-sm text-red-800">
                              {order.description}
                            </div>
                          </div>
                        )}

                        {/* Progresso Individual */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-red-700">Progresso</span>
                            <span className="text-red-700">{Math.round(orderProgress)}%</span>
                          </div>
                          <Progress value={orderProgress} className="h-1.5" />
                        </div>

                        {/* Ações de Progresso para Ordem Selecionada */}
                        {selectedOrderId === order.id && onUpdateStatus && (
                          <div className="pt-2 border-t border-red-200">
                            <NextStatusButton
                              serviceOrder={order}
                              onUpdateStatus={async (orderId: string, newStatus: string, notes?: string) => {
                                await onUpdateStatus(orderId, newStatus as ServiceOrderStatus, notes);
                                return true;
                              }}
                              relatedOrders={sortedOrders.filter(o => o.id !== order.id)}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="space-y-3 pt-2">
          {/* Botões de Navegação e Contato */}
          <div className="flex gap-2">
            {/* Botão de Navegação */}
            {onNavigate && primaryOrder.pickupAddress && (
              <Button
                onClick={() => onNavigate(primaryOrder.pickupAddress!)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Navegar
              </Button>
            )}

            {/* Botão de Telefone */}
            {primaryOrder.clientPhone && (
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                onClick={() => window.open(`tel:${primaryOrder.clientPhone}`)}
              >
                <Phone className="w-4 h-4" />
              </Button>
            )}

            {/* Botão de Detalhes */}
            {onViewOrder && (
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                onClick={() => onViewOrder(primaryOrder.id)}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Rodapé com Informações */}
        <div className="flex justify-between items-center pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <DisplayNumber item={primaryOrder} variant="inline" size="sm" showIcon={false} />
          </div>

          {hasMultipleOrders && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 text-green-600" />
                <span className="text-green-700">{currentOrders.length} atuais</span>
              </div>
              {hasOverdueOrders && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-red-600" />
                  <span className="text-red-700">{overdueOrders.length} atrasada{overdueOrders.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          {currentOrders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto px-3 py-1 text-xs border-[#e5b034] text-[#e5b034] hover:bg-[#e5b034]/10"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Recolher Detalhes
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  {hasMultipleOrders
                    ? `Ver Detalhes (${allActiveOrders.length})`
                    : 'Ver Detalhes'
                  }
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
