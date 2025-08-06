import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServiceOrder, ServiceOrderStatus } from '@/types';
import {
  Package,
  Clock,
  MapPin,
  User,
  Wrench,
  AlertTriangle,
  Factory,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import NextStatusButton from '@/components/ServiceOrders/ProgressTracker/NextStatusButton';
import { cardPresets, cardText, statusBadge, alertClasses, cardSurface } from '@/lib/cardStyles';

interface CollectedEquipmentCardProps {
  collectedOrders: ServiceOrder[];
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus, notes?: string) => Promise<void>;
  className?: string;
}

export const CollectedEquipmentCard: React.FC<CollectedEquipmentCardProps> = ({
  collectedOrders,
  onUpdateStatus,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Expandido por padrão para visibilidade

  if (!collectedOrders || collectedOrders.length === 0) {
    return null; // Não mostrar o card se não há equipamentos coletados
  }

  const getCollectionTime = (order: ServiceOrder): string => {
    // Tentar pegar o horário da última atualização ou usar horário atual como fallback
    if (order.updatedAt) {
      return format(new Date(order.updatedAt), 'HH:mm', { locale: ptBR });
    }
    if (order.scheduledDate) {
      return format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR });
    }
    return 'Horário não disponível';
  };

  return (
    <>
      <Card className={cn(cardPresets.statusOrange, className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 status-orange-text" />
              <span className={cardText.primary}>
                Equipamentos para Oficina
              </span>
              <Badge variant="secondary" className={statusBadge.orange}>
                {collectedOrders.length} pendente{collectedOrders.length > 1 ? 's' : ''}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-1"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Alerta de Ação Necessária */}
          <div className={cn(alertClasses.warning, "flex items-center gap-2 p-2 rounded-lg")}>
            <AlertTriangle className="w-4 h-4 status-orange-text" />
            <div className="text-xs status-orange-text">
              <span className="font-medium">{collectedOrders.length} equipamento{collectedOrders.length > 1 ? 's' : ''}</span> aguardando definição de oficina responsável
            </div>
          </div>

          {/* Lista de Equipamentos Coletados */}
          {isExpanded && (
            <div className="space-y-3">
              {collectedOrders.map((order) => {
                const collectionTime = getCollectionTime(order);

                return (
                  <div
                    key={order.id}
                    className={cn(cardSurface.elevated, "p-3 border rounded-lg hover:shadow-sm transition-all duration-200 status-orange-border")}
                  >
                    <div className="space-y-3">
                      {/* Informações do Cliente e Equipamento */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className={cn("font-semibold", cardText.primary)}>{order.clientName}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                            <span className={cn("text-sm", cardText.secondary)}>
                              {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 status-orange-text" />
                            <span className="text-sm status-orange-text">
                              Coletado às {collectionTime}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground mb-2">
                            <DisplayNumber item={order} variant="inline" size="sm" showIcon={false} />
                          </div>
                          <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                            Coletado
                          </Badge>
                        </div>
                      </div>

                      {/* Endereço de Coleta */}
                      {order.pickupAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm text-muted-foreground">
                            {order.pickupAddress}
                          </span>
                        </div>
                      )}

                      {/* Descrição se houver */}
                      {order.description && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          {order.description}
                        </div>
                      )}

                      {/* Botão de Ação - NextStatusButton */}
                      <div className="pt-2 border-t border-orange-200">
                        <NextStatusButton
                          serviceOrder={order}
                          onUpdateStatus={async (orderId: string, newStatus: string, notes?: string) => {
                            if (onUpdateStatus) {
                              await onUpdateStatus(orderId, newStatus as ServiceOrderStatus, notes);
                              return true;
                            }
                            return false;
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumo Compacto quando Recolhido */}
          {!isExpanded && (
            <div className="space-y-2">
              {collectedOrders.slice(0, 2).map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border border-orange-200">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">{order.clientName}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-muted-foreground">{order.equipmentType}</span>
                  </div>
                  <div className="flex-shrink-0">
                    <NextStatusButton
                      serviceOrder={order}
                      onUpdateStatus={async (orderId: string, newStatus: string, notes?: string) => {
                        if (onUpdateStatus) {
                          await onUpdateStatus(orderId, newStatus as ServiceOrderStatus, notes);
                          return true;
                        }
                        return false;
                      }}
                    />
                  </div>
                </div>
              ))}
              
              {collectedOrders.length > 2 && (
                <div className="text-xs text-center text-muted-foreground">
                  +{collectedOrders.length - 2} equipamentos
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
