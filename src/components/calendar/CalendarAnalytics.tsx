import React from 'react';
import { CalendarEvent } from '@/types/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';
import { format, isToday, isTomorrow, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarAnalyticsProps {
  events: CalendarEvent[];
  technicians: any[];
  currentDate: Date;
}

const CalendarAnalytics: React.FC<CalendarAnalyticsProps> = ({
  events,
  technicians,
  currentDate
}) => {
  // Calcular métricas
  const totalEvents = events.length;
  const confirmedEvents = events.filter(e => e.status === 'confirmed').length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const suggestedEvents = events.filter(e => e.status === 'suggested').length;
  const cancelledEvents = events.filter(e => e.status === 'cancelled').length;

  const todayEvents = events.filter(e => isToday(e.startTime)).length;
  const tomorrowEvents = events.filter(e => isTomorrow(e.startTime)).length;

  // Eventos da semana atual
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEvents = events.filter(e => 
    e.startTime >= weekStart && e.startTime <= weekEnd
  ).length;

  // Taxa de conclusão
  const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
  
  // Taxa de confirmação
  const confirmationRate = totalEvents > 0 ? (confirmedEvents / totalEvents) * 100 : 0;

  // Produtividade por técnico
  const technicianStats = technicians.map(tech => {
    const techEvents = events.filter(e => e.technicianId === tech.id);
    const techCompleted = techEvents.filter(e => e.status === 'completed').length;
    const techRate = techEvents.length > 0 ? (techCompleted / techEvents.length) * 100 : 0;
    
    return {
      id: tech.id,
      name: tech.name,
      totalEvents: techEvents.length,
      completedEvents: techCompleted,
      completionRate: techRate
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  // Distribuição por status
  const statusDistribution = [
    { status: 'confirmed', count: confirmedEvents, label: 'Confirmados', color: 'bg-blue-500' },
    { status: 'completed', count: completedEvents, label: 'Concluídos', color: 'bg-green-500' },
    { status: 'suggested', count: suggestedEvents, label: 'Sugeridos', color: 'bg-yellow-500' },
    { status: 'cancelled', count: cancelledEvents, label: 'Cancelados', color: 'bg-red-500' }
  ];

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    color = 'blue',
    delay = 0 
  }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="shadow-lg border-0 hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            <div className={`p-3 rounded-full bg-${color}-100`}>
              <Icon className={`h-6 w-6 text-${color}-600`} />
            </div>
          </div>
          {trend && (
            <div className="flex items-center mt-4">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}% vs semana anterior
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Agendamentos"
          value={totalEvents}
          subtitle="Esta semana"
          icon={Calendar}
          trend={12}
          color="blue"
          delay={0}
        />
        <MetricCard
          title="Hoje"
          value={todayEvents}
          subtitle="Agendamentos para hoje"
          icon={Clock}
          color="green"
          delay={0.1}
        />
        <MetricCard
          title="Taxa de Conclusão"
          value={`${completionRate.toFixed(1)}%`}
          subtitle={`${completedEvents} de ${totalEvents} concluídos`}
          icon={CheckCircle}
          trend={5}
          color="emerald"
          delay={0.2}
        />
        <MetricCard
          title="Amanhã"
          value={tomorrowEvents}
          subtitle="Agendamentos para amanhã"
          icon={Target}
          color="purple"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Status */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusDistribution.map((item, index) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded ${item.color}`}></div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{item.count}</span>
                      <div className="w-20">
                        <Progress 
                          value={totalEvents > 0 ? (item.count / totalEvents) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {totalEvents > 0 ? ((item.count / totalEvents) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Ranking de Técnicos */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance dos Técnicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {technicianStats.slice(0, 5).map((tech, index) => (
                  <div key={tech.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm
                        ${index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{tech.name}</div>
                        <div className="text-sm text-gray-600">
                          {tech.completedEvents}/{tech.totalEvents} concluídos
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {tech.completionRate.toFixed(0)}%
                      </div>
                      <Progress value={tech.completionRate} className="w-16 h-2" />
                    </div>
                  </div>
                ))}
                {technicianStats.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    Nenhum técnico com agendamentos
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Resumo da Semana */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo da Semana
            </CardTitle>
            <p className="text-sm text-gray-600">
              {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{weekEvents}</div>
                <div className="text-sm text-gray-600">Total de Agendamentos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{confirmationRate.toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Taxa de Confirmação</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{completionRate.toFixed(0)}%</div>
                <div className="text-sm text-gray-600">Taxa de Conclusão</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{technicians.length}</div>
                <div className="text-sm text-gray-600">Técnicos Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default CalendarAnalytics;
