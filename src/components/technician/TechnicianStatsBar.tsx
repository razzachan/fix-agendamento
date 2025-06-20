import React from 'react';
import { ServiceOrder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  MapPin, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

interface TechnicianStatsBarProps {
  technicianOrders: ServiceOrder[];
}

export const TechnicianStatsBar: React.FC<TechnicianStatsBarProps> = ({
  technicianOrders
}) => {
  // Calcular estatísticas
  const activeOrders = technicianOrders.filter(order => 
    order.status !== 'completed' && order.status !== 'cancelled'
  );
  
  const completedToday = technicianOrders.filter(order => {
    if (order.status !== 'completed' || !order.completedDate) return false;
    const today = new Date().toDateString();
    const completedDate = new Date(order.completedDate).toDateString();
    return today === completedDate;
  });
  
  const urgentOrders = activeOrders.filter(order => 
    order.serviceAttendanceType === 'em_domicilio' && 
    order.scheduledDate &&
    new Date(order.scheduledDate) <= new Date(Date.now() + 2 * 60 * 60 * 1000) // próximas 2 horas
  );
  
  // Agrupar por endereços únicos
  const uniqueAddresses = new Set(
    activeOrders.map(order => 
      `${order.clientName}-${order.clientFullAddress || order.pickupAddress}`
    )
  ).size;
  
  // Calcular progresso geral
  const totalOrders = technicianOrders.length;
  const completedOrders = technicianOrders.filter(order => order.status === 'completed').length;
  const overallProgress = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  const stats = [
    {
      label: 'Ordens Ativas',
      value: activeOrders.length,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      label: 'Endereços Únicos',
      value: uniqueAddresses,
      icon: MapPin,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      label: 'Concluídas Hoje',
      value: completedToday.length,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200'
    },
    {
      label: 'Urgentes',
      value: urgentOrders.length,
      icon: AlertTriangle,
      color: urgentOrders.length > 0 ? 'text-red-600' : 'text-gray-400',
      bgColor: urgentOrders.length > 0 ? 'bg-red-50' : 'bg-gray-50',
      borderColor: urgentOrders.length > 0 ? 'border-red-200' : 'border-gray-200'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Barra de progresso geral */}
      <Card className="bg-gradient-to-r from-[#e5b034] to-[#d4a02a] text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              <span className="font-medium">Progresso Geral</span>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {Math.round(overallProgress)}%
            </Badge>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm mt-2 opacity-90">
            <span>{completedOrders} concluídas</span>
            <span>{totalOrders} total</span>
          </div>
        </CardContent>
      </Card>

      {/* Grid de estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className={`${stat.bgColor} ${stat.borderColor} border transition-all duration-200 hover:shadow-md`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs font-medium text-gray-600 truncate">
                    {stat.label}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas rápidos */}
      {urgentOrders.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {urgentOrders.length} ordem{urgentOrders.length > 1 ? 's' : ''} urgente{urgentOrders.length > 1 ? 's' : ''} 
                (próximas 2 horas)
              </span>
            </div>
            <div className="mt-2 space-y-1">
              {urgentOrders.slice(0, 2).map(order => (
                <div key={order.id} className="text-xs text-red-600">
                  • {order.clientName} - {order.equipmentType}
                  {order.scheduledDate && (
                    <span className="ml-2">
                      ({new Date(order.scheduledDate).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })})
                    </span>
                  )}
                </div>
              ))}
              {urgentOrders.length > 2 && (
                <div className="text-xs text-red-500">
                  +{urgentOrders.length - 2} mais...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TechnicianStatsBar;
