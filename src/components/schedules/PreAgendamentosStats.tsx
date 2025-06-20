import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgendamentoAI } from '@/services/agendamentos';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Route, 
  Package,
  Users,
  Calendar,
  XCircle
} from 'lucide-react';

interface PreAgendamentosStatsProps {
  agendamentos: AgendamentoAI[];
}

const PreAgendamentosStats: React.FC<PreAgendamentosStatsProps> = ({ agendamentos }) => {
  // Calcular estatísticas
  const stats = {
    total: agendamentos.length,
    pendentes: agendamentos.filter(a => a.status === 'pendente').length,
    confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
    roteirizados: agendamentos.filter(a => a.status === 'roteirizado').length,
    convertidos: agendamentos.filter(a => a.status === 'convertido').length,
    cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
    urgentes: agendamentos.filter(a => a.urgente).length,
    comMultiplosEquipamentos: agendamentos.filter(a => {
      const equipamentos = Array.isArray(a.equipamentos) 
        ? a.equipamentos 
        : (typeof a.equipamentos === 'string' && a.equipamentos.startsWith('[')) 
          ? JSON.parse(a.equipamentos) 
          : [a.equipamento].filter(Boolean);
      return equipamentos.length > 1;
    }).length
  };

  const statCards = [
    {
      title: 'Total',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Em Aberto',
      value: stats.pendentes,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'Confirmados',
      value: stats.confirmados,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Roteirizados',
      value: stats.roteirizados,
      icon: Route,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'OS Criadas',
      value: stats.convertidos,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Cancelados',
      value: stats.cancelados,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  ];

  return (
    <div className="mb-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.title}
              className={`${stat.bgColor} ${stat.borderColor} border transition-all duration-200 hover:shadow-md`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Badges de Destaque */}
      {(stats.urgentes > 0 || stats.comMultiplosEquipamentos > 0) && (
        <div className="flex flex-wrap gap-2">
          {stats.urgentes > 0 && (
            <Badge 
              variant="destructive" 
              className="flex items-center gap-1 px-3 py-1"
            >
              <AlertTriangle className="h-4 w-4" />
              {stats.urgentes} Urgente{stats.urgentes > 1 ? 's' : ''}
            </Badge>
          )}
          
          {stats.comMultiplosEquipamentos > 0 && (
            <Badge 
              variant="secondary" 
              className="flex items-center gap-1 px-3 py-1 bg-[#e5b034]/10 text-[#e5b034] border-[#e5b034]/20"
            >
              <Package className="h-4 w-4" />
              {stats.comMultiplosEquipamentos} com Múltiplos Equipamentos
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default PreAgendamentosStats;
