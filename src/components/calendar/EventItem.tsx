
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Wrench, MapPin, UserCheck, DollarSign, Phone } from 'lucide-react';
import { ScheduledService } from '@/types';
import { useNavigate } from 'react-router-dom';
import { DisplayNumber } from '@/components/common/DisplayNumber';
import { supabase } from '@/integrations/supabase/client';

interface EventItemProps {
  service: ScheduledService;
  getStatusBadge: (status: string) => { label: string; className: string };
  formatTime: (isoString: string) => string;
  getStatusColor: (status: string) => string;
  user: any;
}

const EventItem: React.FC<EventItemProps> = ({
  service,
  getStatusBadge,
  formatTime,
  getStatusColor,
  user
}) => {
  const navigate = useNavigate();
  const badgeData = getStatusBadge(service.status);
  const [finalCost, setFinalCost] = useState<number | null>(service.finalCost || null);
  const [equipmentInfo, setEquipmentInfo] = useState<{equipmentType: string, equipmentModel?: string} | null>(null);

  // ✅ Buscar informações da OS se não estiver disponível
  useEffect(() => {
    const fetchServiceOrderInfo = async () => {
      if (!service.serviceOrderId) return;

      try {
        const { data, error } = await supabase
          .from('service_orders')
          .select('final_cost, equipment_type, equipment_model')
          .eq('id', service.serviceOrderId)
          .single();

        if (error) return;

        if (data?.final_cost && !service.finalCost) {
          setFinalCost(data.final_cost);
        }

        if (data?.equipment_type) {
          setEquipmentInfo({
            equipmentType: data.equipment_type,
            equipmentModel: data.equipment_model
          });
        }
      } catch (error) {
        // Silencioso - não é crítico
      }
    };

    fetchServiceOrderInfo();
  }, [service.serviceOrderId, service.finalCost]);
  
  const handleClick = () => {
    if (user?.role === 'technician') {
      navigate(`/technician?orderId=${service.serviceOrderId}`);
    } else if (user?.role === 'admin') {
      navigate(`/orders/${service.serviceOrderId}`);
    }
  };
  
  return (
    <div 
      key={service.id} 
      className={`border rounded-lg p-5 transition-all hover:shadow-lg cursor-pointer bg-white ${getStatusColor(service.status)} hover:scale-[1.01] duration-200`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          {/* Equipamento primeiro */}
          {equipmentInfo && (
            <div className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
              <Wrench className="h-5 w-5 text-[#e5b034]" />
              <span>{equipmentInfo.equipmentType}{equipmentInfo.equipmentModel && ` - ${equipmentInfo.equipmentModel}`}</span>
            </div>
          )}

          {/* Problema/Descrição */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <div className="text-sm font-medium text-gray-600 mb-1">Problema Relatado:</div>
            <div className="text-sm text-gray-800">{service.description}</div>
          </div>

          {/* Cliente */}
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <UserCheck className="h-4 w-4 text-gray-500" />
            <span>Cliente: <span className="font-medium">{service.clientName}</span></span>
          </div>
          
          {user?.role === 'admin' && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <UserCheck className="h-4 w-4 text-indigo-500" />
              <span>Técnico: <span className="font-medium">{service.technicianName}</span></span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="truncate max-w-[250px]">{service.address}</span>
          </div>

          {/* ✅ Telefone do Cliente */}
          {service.clientPhone && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{service.clientPhone}</span>
            </div>
          )}
          
          {service.serviceOrderId && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <Wrench className="h-3.5 w-3.5" />
              <DisplayNumber item={{id: service.serviceOrderId}} variant="inline" size="sm" showIcon={true} />
            </div>
          )}

          {/* ✅ Valor da OS - Design Elegante */}
          {finalCost && finalCost > 0 && (
            <div className="flex items-center gap-2 text-sm font-semibold mt-3 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg border border-emerald-200">
              <DollarSign className="h-4 w-4" />
              <span>R$ {finalCost.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <Badge variant="outline" className={`${badgeData.className} px-3 py-1 text-xs font-medium`}>
            {badgeData.label}
          </Badge>
          
          <div className="flex items-center text-sm font-medium mt-1 bg-gray-50 px-3 py-1.5 rounded-full">
            <CalendarClock className="h-4 w-4 mr-1.5 text-purple-500" />
            {formatTime(service.scheduledStartTime)} - {formatTime(service.scheduledEndTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventItem;
