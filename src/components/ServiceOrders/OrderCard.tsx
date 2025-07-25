import React from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Wrench, 
  Clock,
  Image as ImageIcon,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { translateStatus } from '@/utils/translations';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromServiceOrder } from '@/utils/addressFormatter';

interface OrderCardProps {
  order: ServiceOrder;
  onClick: () => void;
  onUpdateStatus?: (id: string, status: string) => Promise<void>;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onClick,
  onUpdateStatus
}) => {
  // Pegar a primeira imagem se existir
  const firstImage = order.images && order.images.length > 0 ? order.images[0] : null;
  
  // Formatação de data
  const scheduledDate = order.scheduledDate 
    ? format(new Date(order.scheduledDate), 'dd/MM/yyyy', { locale: ptBR })
    : null;
    
  const scheduledTime = order.scheduledDate 
    ? format(new Date(order.scheduledDate), 'HH:mm', { locale: ptBR })
    : null;

  // Cores baseadas no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
      case 'in_progress': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800';
      case 'at_workshop': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
      case 'awaiting_approval': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800';
      case 'approved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
      case 'ready_for_delivery': return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-800';
      case 'completed': return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
      default: return 'bg-gray-100 dark:bg-gray-800/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-[#e5b034] bg-white dark:bg-gray-800"
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Imagem do técnico se existir */}
        {firstImage && (
          <div className="mb-3 relative rounded-md overflow-hidden">
            <img
              src={firstImage.url}
              alt={firstImage.name}
              className="w-full h-28 object-cover"
              loading="lazy"
              onError={(e) => {
                // Se a imagem falhar ao carregar, esconder o container
                const target = e.target as HTMLImageElement;
                target.parentElement?.remove();
              }}
            />
            {order.images.length > 1 && (
              <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {order.images.length}
              </div>
            )}
          </div>
        )}

        {/* Informações principais */}
        <div className="space-y-2">
          {/* Cliente e OS */}
          <div>
            <h3 className="font-medium text-sm text-gray-900 truncate mb-1">
              {order.clientName}
            </h3>
            <p className="text-xs text-gray-500 font-mono">
              OS #{order.id.substring(0, 8)}
            </p>
          </div>

          {/* Equipamento */}
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Wrench className="h-3 w-3 text-gray-500" />
            <span className="truncate font-medium">{order.equipmentType}</span>
          </div>

          {/* Técnico */}
          {order.technicianName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <User className="h-3 w-3 text-blue-500" />
              <span className="truncate">{order.technicianName}</span>
            </div>
          )}

          {/* Data e hora agendada */}
          {scheduledDate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Calendar className="h-3 w-3 text-green-500" />
              <span>{scheduledDate}</span>
              {scheduledTime && (
                <>
                  <Clock className="h-3 w-3 ml-1 text-green-500" />
                  <span className="font-medium">{scheduledTime}</span>
                </>
              )}
            </div>
          )}

          {/* Endereço */}
          <AddressDisplay
            data={extractAddressFromServiceOrder(order)}
            variant="compact"
            className="text-xs text-gray-600"
            iconClassName="h-3 w-3 text-red-500"
          />

          {/* Telefone */}
          {order.clientPhone && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="h-3 w-3 text-purple-500" />
              <span className="font-mono">{order.clientPhone}</span>
            </div>
          )}

          {/* Status e Botão */}
          <div className="pt-3 space-y-2">
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", getStatusColor(order.status))}
            >
              {translateStatus(order.status)}
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="w-full text-xs h-7 hover:bg-[#e5b034]/10 hover:text-[#e5b034] border border-transparent hover:border-[#e5b034]/20"
            >
              <Eye className="h-3 w-3 mr-1" />
              Ver Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
