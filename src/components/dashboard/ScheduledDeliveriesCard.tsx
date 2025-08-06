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
  ChevronUp,
  Calendar,
  Navigation,
  Hash,
  Camera,
  Building2,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import NextStatusButton from '@/components/ServiceOrders/ProgressTracker/NextStatusButton';
import { cardPresets, cardText, statusBadge, alertClasses } from '@/lib/cardStyles';

interface ScheduledDeliveriesCardProps {
  scheduledDeliveries: ServiceOrder[];
  onUpdateStatus?: (orderId: string, newStatus: ServiceOrderStatus, notes?: string) => Promise<void>;
  className?: string;
}

export const ScheduledDeliveriesCard: React.FC<ScheduledDeliveriesCardProps> = ({
  scheduledDeliveries,
  onUpdateStatus,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Expandido por padrão para visibilidade

  if (!scheduledDeliveries || scheduledDeliveries.length === 0) {
    return null; // Não mostrar o card se não há entregas agendadas
  }

  // Função para abrir Google Maps com direções para a oficina
  const openGoogleMaps = (workshopAddress: string) => {
    const encodedAddress = encodeURIComponent(workshopAddress);
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    window.open(googleMapsUrl, '_blank');
  };

  // Função para obter endereço da oficina (mock - você pode integrar com dados reais)
  const getWorkshopInfo = (order: ServiceOrder) => {
    // Mock data - substitua pela lógica real de busca da oficina
    return {
      name: "Oficina Central Fix Fogões",
      address: "Rua das Oficinas, 123 - Centro, Florianópolis - SC",
      phone: "(48) 3333-4444"
    };
  };

  const getScheduledTime = (order: ServiceOrder): string => {
    // Tentar pegar o horário agendado ou usar horário atual como fallback
    if (order.scheduledDate) {
      return format(new Date(order.scheduledDate), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    }
    return 'Horário não disponível';
  };

  return (
    <>
      <Card className={cn(cardPresets.statusBlue, className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 status-blue-text" />
              <span className={cardText.primary}>
                Entregas Agendadas
              </span>
              <Badge variant="secondary" className={statusBadge.blue}>
                {scheduledDeliveries.length} agendada{scheduledDeliveries.length > 1 ? 's' : ''}
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
          <div className={cn(alertClasses.info, "flex items-center gap-2 p-2 rounded-lg")}>
            <Factory className="w-4 h-4 status-blue-text" />
            <div className="text-xs status-blue-text">
              <span className="font-medium">{scheduledDeliveries.length} equipamento{scheduledDeliveries.length > 1 ? 's' : ''}</span> aguardando coleta na oficina para entrega
            </div>
          </div>

          {/* Lista de Entregas Agendadas */}
          {isExpanded && (
            <div className="space-y-3">
              {scheduledDeliveries.map((order) => {
                const scheduledTime = getScheduledTime(order);

                return (
                  <div
                    key={order.id}
                    className={cn("p-4 border rounded-lg hover:shadow-sm transition-all duration-200 status-blue-border bg-blue-50")}
                  >
                    <div className="space-y-4">
                      {/* Header com Cliente e Número da OS */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className={cn("font-semibold", cardText.primary)}>{order.clientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono text-muted-foreground">
                            <DisplayNumber item={order} />
                          </span>
                        </div>
                      </div>

                      {/* Informações do Equipamento */}
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          {/* Foto do Equipamento (placeholder) */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                              <Camera className="w-6 h-6 text-gray-400" />
                            </div>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-muted-foreground" />
                              <span className={cn("font-medium", cardText.primary)}>
                                {order.equipmentType} {order.equipmentModel && `- ${order.equipmentModel}`}
                              </span>
                            </div>

                            {order.description && (
                              <div className="text-sm text-muted-foreground">
                                <strong>Problema:</strong> {order.description}
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 status-blue-text" />
                              <span className="text-sm status-blue-text">
                                Entrega agendada: {scheduledTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informações da Oficina */}
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium text-sm">Localização do Equipamento</span>
                            </div>

                            <div className="space-y-1">
                              <div className="text-sm font-medium">{getWorkshopInfo(order).name}</div>
                              <div className="text-sm text-muted-foreground">{getWorkshopInfo(order).address}</div>
                              <div className="text-sm text-muted-foreground">{getWorkshopInfo(order).phone}</div>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openGoogleMaps(getWorkshopInfo(order).address)}
                            className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Navigation className="w-4 h-4" />
                            <span>Ir para Oficina</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                        <div className="text-xs text-muted-foreground">
                          Equipamento pronto para coleta e entrega
                        </div>
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
              {scheduledDeliveries.slice(0, 2).map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm p-2 bg-white rounded border border-blue-200">
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
              
              {scheduledDeliveries.length > 2 && (
                <div className="text-xs text-center text-muted-foreground">
                  +{scheduledDeliveries.length - 2} entregas agendadas
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
