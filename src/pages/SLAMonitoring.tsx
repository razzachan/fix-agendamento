import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  Wrench, 
  CheckCircle,
  Calendar,
  MapPin,
  User,
  Phone,
  RefreshCw,
  Eye,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DisplayNumber } from '@/components/common/DisplayNumber';

interface SLAViolation {
  id: string;
  type: 'pending_too_long' | 'overdue_schedule' | 'stuck_repair' | 'ready_too_long';
  order_number: string;
  client_name: string;
  equipment_type: string;
  status: string;
  created_at: string;
  scheduled_date?: string;
  days_overdue: number;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const SLAMonitoring: React.FC = () => {
  const [violations, setViolations] = useState<SLAViolation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  const violationTypes = {
    pending_too_long: {
      label: 'Ordens Pendentes há +24h',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      description: 'Ordens criadas há mais de 24 horas sem agendamento'
    },
    overdue_schedule: {
      label: 'Agendamentos Atrasados',
      icon: Calendar,
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'Agendamentos que passaram da data/hora marcada'
    },
    stuck_repair: {
      label: 'Reparos Parados +7 dias',
      icon: Wrench,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'Reparos em andamento há mais de 7 dias sem progresso'
    },
    ready_too_long: {
      label: 'Prontos há +5 dias',
      icon: Package,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Equipamentos prontos para entrega há mais de 5 dias'
    }
  };

  const loadSLAViolations = async () => {
    setIsLoading(true);
    try {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const today = new Date().toISOString().split('T')[0];

      const allViolations: SLAViolation[] = [];

      // 1. Ordens pendentes há mais de 24h
      const { data: pendingOrders } = await supabase
        .from('service_orders')
        .select('*')
        .eq('status', 'pending')
        .lte('created_at', oneDayAgo.toISOString());

      if (pendingOrders) {
        pendingOrders.forEach(order => {
          const daysOverdue = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
          allViolations.push({
            id: order.id,
            type: 'pending_too_long',
            order_number: order.order_number,
            client_name: order.client_name,
            equipment_type: order.equipment_type,
            status: order.status,
            created_at: order.created_at,
            days_overdue: daysOverdue,
            description: `Ordem criada há ${daysOverdue} dias sem agendamento`,
            priority: daysOverdue > 3 ? 'critical' : daysOverdue > 2 ? 'high' : 'medium'
          });
        });
      }

      // 2. Agendamentos atrasados
      const { data: overdueOrders } = await supabase
        .from('service_orders')
        .select('*')
        .eq('status', 'scheduled')
        .lt('scheduled_date', today);

      if (overdueOrders) {
        overdueOrders.forEach(order => {
          const daysOverdue = Math.floor((new Date().getTime() - new Date(order.scheduled_date).getTime()) / (1000 * 60 * 60 * 24));
          allViolations.push({
            id: order.id,
            type: 'overdue_schedule',
            order_number: order.order_number,
            client_name: order.client_name,
            equipment_type: order.equipment_type,
            status: order.status,
            created_at: order.created_at,
            scheduled_date: order.scheduled_date,
            days_overdue: daysOverdue,
            description: `Agendamento atrasado há ${daysOverdue} dias`,
            priority: daysOverdue > 2 ? 'critical' : daysOverdue > 1 ? 'high' : 'medium'
          });
        });
      }

      // 3. Reparos parados há mais de 7 dias
      const { data: stuckRepairs } = await supabase
        .from('service_orders')
        .select('*')
        .in('status', ['in_progress', 'quote_approved'])
        .lte('created_at', sevenDaysAgo.toISOString());

      if (stuckRepairs) {
        stuckRepairs.forEach(order => {
          const daysOverdue = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
          allViolations.push({
            id: order.id,
            type: 'stuck_repair',
            order_number: order.order_number,
            client_name: order.client_name,
            equipment_type: order.equipment_type,
            status: order.status,
            created_at: order.created_at,
            days_overdue: daysOverdue,
            description: `Reparo parado há ${daysOverdue} dias`,
            priority: daysOverdue > 14 ? 'critical' : daysOverdue > 10 ? 'high' : 'medium'
          });
        });
      }

      // 4. Equipamentos prontos há mais de 5 dias
      const { data: readyTooLong } = await supabase
        .from('service_orders')
        .select('*')
        .eq('status', 'ready_for_pickup')
        .lte('created_at', fiveDaysAgo.toISOString());

      if (readyTooLong) {
        readyTooLong.forEach(order => {
          const daysOverdue = Math.floor((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24));
          allViolations.push({
            id: order.id,
            type: 'ready_too_long',
            order_number: order.order_number,
            client_name: order.client_name,
            equipment_type: order.equipment_type,
            status: order.status,
            created_at: order.created_at,
            days_overdue: daysOverdue,
            description: `Pronto para entrega há ${daysOverdue} dias`,
            priority: daysOverdue > 10 ? 'critical' : daysOverdue > 7 ? 'high' : 'medium'
          });
        });
      }

      // Ordenar por prioridade e dias
      allViolations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return b.days_overdue - a.days_overdue;
      });

      setViolations(allViolations);
    } catch (error) {
      console.error('Erro ao carregar violações de SLA:', error);
      toast.error('Erro ao carregar violações de SLA');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSLAViolations();
  }, []);

  const filteredViolations = selectedType === 'all' 
    ? violations 
    : violations.filter(v => v.type === selectedType);

  const getViolationCounts = () => {
    const counts = {
      pending_too_long: 0,
      overdue_schedule: 0,
      stuck_repair: 0,
      ready_too_long: 0
    };
    violations.forEach(v => counts[v.type]++);
    return counts;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const counts = getViolationCounts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento de SLA</h1>
          <p className="text-muted-foreground">
            Violações de Service Level Agreement que precisam de atenção imediata
          </p>
        </div>
        <Button onClick={loadSLAViolations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Legendas dos Tipos de Violação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(violationTypes).map(([type, config]) => {
          const Icon = config.icon;
          const count = counts[type as keyof typeof counts];
          return (
            <Card 
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedType === type ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <Badge className={config.color}>
                    {count}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1">{config.label}</h3>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Botão para ver todas */}
      {selectedType !== 'all' && (
        <Button 
          variant="outline" 
          onClick={() => setSelectedType('all')}
          className="w-full"
        >
          Ver Todas as Violações ({violations.length})
        </Button>
      )}

      {/* Lista de Violações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {selectedType === 'all' 
              ? `Todas as Violações (${filteredViolations.length})`
              : `${violationTypes[selectedType as keyof typeof violationTypes]?.label} (${filteredViolations.length})`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredViolations.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                Nenhuma Violação Encontrada!
              </h3>
              <p className="text-muted-foreground">
                Todos os SLAs estão sendo cumpridos adequadamente.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredViolations.map((violation) => {
                const ViolationIcon = violationTypes[violation.type].icon;
                return (
                  <Card key={violation.id} className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <ViolationIcon className="h-5 w-5 text-muted-foreground" />
                            <DisplayNumber 
                              item={{ order_number: violation.order_number }} 
                              variant="inline" 
                              size="sm" 
                              showIcon={false}
                            />
                            <Badge className={getPriorityColor(violation.priority)}>
                              {violation.priority.toUpperCase()}
                            </Badge>
                            <Badge className={violationTypes[violation.type].color}>
                              {violation.days_overdue} dias
                            </Badge>
                          </div>
                          
                          <h4 className="font-semibold mb-1">{violation.client_name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {violation.equipment_type}
                          </p>
                          <p className="text-sm font-medium text-red-700">
                            {violation.description}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>Criado: {format(new Date(violation.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                            {violation.scheduled_date && (
                              <span>Agendado: {format(new Date(violation.scheduled_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver OS
                          </Button>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ação
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SLAMonitoring;
