import React, { useState } from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  Phone,
  Navigation,
  Eye,
  MessageCircle
} from 'lucide-react';
import { QuickProgressButton } from './QuickProgressButton';
import { useNavigate } from 'react-router-dom';
import { translateStatus } from '@/utils/translations';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromServiceOrder } from '@/utils/addressFormatter';

interface AddressGroupCardProps {
  address: string;
  clientName: string;
  orders: ServiceOrder[];
  onSelectOrder: (orderId: string) => void;
  selectedOrderId: string | null;
  onUpdateEquipmentStatus: (orderId: string, equipmentId: string, newStatus: string) => Promise<void>;
}

export const AddressGroupCard: React.FC<AddressGroupCardProps> = ({
  address,
  clientName,
  orders,
  onSelectOrder,
  selectedOrderId,
  onUpdateEquipmentStatus
}) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calcular estatísticas do grupo
  const totalEquipments = orders.reduce((sum, order) => sum + (order.serviceItems?.length || 1), 0);
  const completedEquipments = orders.reduce((sum, order) => {
    return sum + (order.serviceItems?.filter(item => item.status === 'completed').length || 0);
  }, 0);
  const overallProgress = totalEquipments > 0 ? (completedEquipments / totalEquipments) * 100 : 0;
  
  // Obter próximo horário agendado
  const nextScheduledTime = orders
    .filter(order => order.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0]
    ?.scheduledDate;
  
  // Verificar se há equipamentos urgentes
  const hasUrgentEquipments = orders.some(order => 
    order.serviceItems?.some(item => item.priority === 'high')
  );
  
  const clientPhone = orders[0]?.clientPhone;

  // Adaptador para converter a função de atualização de status
  const handleUpdateStatus = async (orderId: string, newStatus: string): Promise<boolean> => {
    try {
      await onUpdateEquipmentStatus(orderId, 'default', newStatus);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return false;
    }
  };

  return (
    <Card className={`transition-all duration-300 ${hasUrgentEquipments ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setIsExpanded(!isExpanded)}>
        {/* Layout Mobile-First */}
        <div className="space-y-3">
          {/* Linha 1: Cliente e Endereço */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <MapPin className="h-5 w-5 text-[#e5b034] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-medium truncate">{clientName}</CardTitle>
                <AddressDisplay
                  data={extractAddressFromServiceOrder(orders[0])}
                  variant="compact"
                  showIcon={false}
                  className="text-sm text-gray-600"
                />
              </div>
            </div>

            {/* Ícone de expansão sempre visível */}
            <div className="flex-shrink-0 ml-2">
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Linha 2: Badges - Layout responsivo */}
          <div className="flex flex-wrap items-center gap-2">
            {hasUrgentEquipments && (
              <Badge variant="destructive" className="text-xs flex-shrink-0">
                Urgente
              </Badge>
            )}

            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {totalEquipments} equipamentos
            </Badge>

            <Badge variant="outline" className="text-xs flex-shrink-0">
              {Math.round(overallProgress)}%
            </Badge>
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div className="mt-3">
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Informações rápidas - Layout mobile otimizado */}
        <div className="space-y-2 mt-2">
          {/* Linha de informações */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              {nextScheduledTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{new Date(nextScheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Package className="h-3 w-3 flex-shrink-0" />
                <span>{orders.length} OS</span>
              </div>
            </div>

            {/* Botões de ação - Compactos para mobile */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {clientPhone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${clientPhone}`);
                  }}
                  title="Ligar para cliente"
                >
                  <Phone className="h-3 w-3" />
                </Button>
              )}

              {clientPhone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-green-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    const cleanPhone = clientPhone.replace(/\D/g, '');
                    const message = encodeURIComponent('Olá! Sou técnico da Fix Fogões. Estou entrando em contato sobre seu serviço agendado.');
                    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
                  }}
                  title="WhatsApp para cliente"
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  // Abrir navegação para o endereço
                  const encodedAddress = encodeURIComponent(address);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
                }}
                title="Navegar para endereço"
              >
                <Navigation className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {orders.map(order => (
            <div
              key={order.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedOrderId === order.id ? 'border-[#e5b034] bg-[#e5b034]/5' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSelectOrder(order.id)}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{order.equipmentType}</div>
                    <div className="text-xs text-gray-500">OS #{order.id.substring(0, 8)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {translateStatus(order.status)}
                    </Badge>

                    {/* Botão de Ver Detalhes */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                      title="Ver detalhes da OS"
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Descrição da OS se disponível */}
                {order.description && (
                  <div className="text-xs text-gray-600 line-clamp-1">
                    {order.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};

export default AddressGroupCard;
