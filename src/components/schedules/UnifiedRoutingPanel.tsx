import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Route, 
  MapPin, 
  Clock, 
  Users, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Calendar,
  Navigation
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { AgendamentoAI } from '@/services/agendamentos';
import { unifiedRoutingService, OptimizedRoute as ServiceOptimizedRoute } from '@/services/routing/unifiedRoutingService';
import { routeApplicationService, ScheduleData } from '@/services/routing/routeApplicationService';
import { Technician } from '@/types';
import { technicianQueryService } from '@/services/technician/technicianQueryService';
import ApplyRouteModal from './ApplyRouteModal';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface UnifiedRoutingPanelProps {
  agendamentos: AgendamentoAI[];
  selectedDate: string;
  onRouteCreated?: (routeData: any) => void;
  onAgendamentosUpdated?: () => void;
}

// Usar a interface do serviço
type OptimizedRoute = ServiceOptimizedRoute & {
  suggestedTechnician?: Technician;
};

const UnifiedRoutingPanel: React.FC<UnifiedRoutingPanelProps> = ({
  agendamentos,
  selectedDate,
  onRouteCreated,
  onAgendamentosUpdated
}) => {
  // Estados
  const [isProcessing, setIsProcessing] = useState(false);
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedLogisticsGroup, setSelectedLogisticsGroup] = useState<'all' | 'A' | 'B' | 'C'>('all');
  const [autoOptimizeEnabled, setAutoOptimizeEnabled] = useState(true);

  // Estados do modal de aplicação
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedRouteForApplication, setSelectedRouteForApplication] = useState<OptimizedRoute | null>(null);

  // Carregar técnicos
  useEffect(() => {
    const loadTechnicians = async () => {
      try {
        console.log('🔧 Carregando técnicos para roteirização...');
        const techList = await technicianQueryService.getAll();
        console.log('🔧 Técnicos carregados:', techList.length);
        setTechnicians(techList);
      } catch (error) {
        console.error('❌ Erro ao carregar técnicos:', error);
      }
    };
    loadTechnicians();
  }, []);

  // Filtrar agendamentos pendentes para a data selecionada
  const pendingAgendamentos = agendamentos.filter(ag => {
    const isDateMatch = !selectedDate || ag.data_preferida === selectedDate;
    const isPending = ag.status === 'pendente' || !ag.data_agendada;
    const isGroupMatch = selectedLogisticsGroup === 'all' || ag.grupo_logistico === selectedLogisticsGroup;
    
    return isDateMatch && isPending && isGroupMatch;
  });

  // Função principal de otimização automática
  const processIntelligentRouting = async () => {
    if (pendingAgendamentos.length === 0) {
      toast.warning('Nenhum pré-agendamento disponível para roteirização');
      return;
    }

    setIsProcessing(true);

    try {
      toast.info('🧠 Iniciando roteirização inteligente...');

      // Usar o serviço unificado de roteirização
      const result = await unifiedRoutingService.processIntelligentRouting(
        agendamentos,
        selectedDate,
        selectedLogisticsGroup
      );

      // Adicionar técnicos sugeridos às rotas
      const routesWithTechnicians = result.routes.map(route => ({
        ...route,
        suggestedTechnician: suggestTechnician(route.logisticsGroup)
      }));

      setOptimizedRoutes(routesWithTechnicians);

      toast.success(`✅ Roteirização concluída! ${result.routes.length} rotas otimizadas criadas`);

      if (onRouteCreated) {
        onRouteCreated(result);
      }

    } catch (error) {
      console.error('Erro na roteirização:', error);
      toast.error('Erro ao processar roteirização inteligente');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sugerir técnico para o grupo
  const suggestTechnician = (group: 'A' | 'B' | 'C'): Technician | undefined => {
    // Lógica simples: retornar primeiro técnico disponível
    // Em implementação real, verificar disponibilidade no calendário
    return technicians.find(tech => tech.is_active) || technicians[0];
  };

  // Determinar grupo logístico para estatísticas
  const determineLogisticsGroup = (agendamento: AgendamentoAI): 'A' | 'B' | 'C' => {
    if (agendamento.grupo_logistico) {
      return agendamento.grupo_logistico as 'A' | 'B' | 'C';
    }
    return 'B'; // Padrão para estatísticas
  };

  // Salvar rota otimizada
  const saveRoute = async (route: OptimizedRoute, technicianId?: string) => {
    try {
      const success = await unifiedRoutingService.saveOptimizedRoute(route, technicianId);
      if (success) {
        toast.success(`Rota do Grupo ${route.logisticsGroup} salva com sucesso!`);
      } else {
        toast.error('Erro ao salvar rota');
      }
    } catch (error) {
      console.error('Erro ao salvar rota:', error);
      toast.error('Erro ao salvar rota');
    }
  };

  // Abrir modal de aplicação de rota
  const openApplyModal = (route: OptimizedRoute) => {
    console.log('🔧 Abrindo modal de aplicação para rota:', route);
    setSelectedRouteForApplication(route);
    setIsApplyModalOpen(true);
    console.log('🔧 Estado do modal definido como aberto');
  };

  // Aplicar rota (confirmar agendamentos selecionados)
  const applyRoute = async (
    selectedAgendamentos: AgendamentoAI[],
    technicianId: string,
    scheduleData: ScheduleData[],
    selectedDate: string
  ) => {
    try {
      toast.info('Aplicando rota e confirmando agendamentos...');

      const result = await routeApplicationService.applyRoute(
        selectedAgendamentos,
        technicianId,
        scheduleData,
        selectedDate
      );

      if (result.success) {
        toast.success(
          `Rota aplicada com sucesso! ${result.confirmedCount} agendamentos confirmados`
        );

        if (result.failedCount > 0) {
          toast.warning(`${result.failedCount} agendamentos falharam`);
        }

        // Atualizar dados
        if (onAgendamentosUpdated) {
          onAgendamentosUpdated();
        }

        // Fechar modal
        setIsApplyModalOpen(false);
        setSelectedRouteForApplication(null);

      } else {
        toast.error('Erro ao aplicar rota');
        if (result.errors.length > 0) {
          console.error('Erros na aplicação:', result.errors);
        }
      }

    } catch (error) {
      console.error('Erro ao aplicar rota:', error);
      toast.error('Erro ao aplicar rota');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <CardTitle>Roteirização Inteligente</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {pendingAgendamentos.length} pré-agendamentos
          </Badge>
        </div>
        <CardDescription>
          Otimização automática de rotas baseada em geolocalização e algoritmos inteligentes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Grupo Logístico</label>
            <Select value={selectedLogisticsGroup} onValueChange={(value: any) => setSelectedLogisticsGroup(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os grupos</SelectItem>
                <SelectItem value="A">Grupo A (Centro - até 10km)</SelectItem>
                <SelectItem value="B">Grupo B (Região - 10-25km)</SelectItem>
                <SelectItem value="C">Grupo C (Distante - +25km)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-end">
            <Button 
              onClick={processIntelligentRouting}
              disabled={isProcessing || pendingAgendamentos.length === 0}
              className="w-full sm:w-auto"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Route className="h-4 w-4 mr-2" />
                  Otimizar Rotas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Estatísticas dos pré-agendamentos */}
        {pendingAgendamentos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{pendingAgendamentos.length}</div>
              <div className="text-xs text-blue-600">Total</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {pendingAgendamentos.filter(ag => ag.urgente).length}
              </div>
              <div className="text-xs text-red-600">Urgentes</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {pendingAgendamentos.filter(ag => ag.coordenadas).length}
              </div>
              <div className="text-xs text-green-600">Geocodificados</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(pendingAgendamentos.map(ag => determineLogisticsGroup(ag))).size}
              </div>
              <div className="text-xs text-purple-600">Grupos</div>
            </div>
          </div>
        )}

        <Separator />

        {/* Resultados da otimização */}
        {optimizedRoutes.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Rotas Otimizadas
            </h4>
            
            {optimizedRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                onSave={saveRoute}
                onApply={openApplyModal}
              />
            ))}
          </div>
        )}

        {/* Estado vazio */}
        {pendingAgendamentos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">
              Nenhum pré-agendamento disponível para a data selecionada
            </p>
            <p className="text-xs mt-1">
              Selecione uma data diferente ou aguarde novos agendamentos
            </p>
          </div>
        )}
      </CardContent>

      {/* Modal de aplicação de rota */}
      <ApplyRouteModal
        isOpen={isApplyModalOpen}
        onClose={() => {
          setIsApplyModalOpen(false);
          setSelectedRouteForApplication(null);
        }}
        route={selectedRouteForApplication}
        onApply={applyRoute}
      />
    </Card>
  );
};

// Componente para exibir cada rota otimizada
const RouteCard: React.FC<{
  route: OptimizedRoute;
  onSave: (route: OptimizedRoute, technicianId?: string) => void;
  onApply: (route: OptimizedRoute) => void;
}> = ({ route, onSave, onApply }) => {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Grupo {route.logisticsGroup}</Badge>
            <span className="text-sm font-medium">{route.sequence.length} atendimentos</span>
          </div>
          <div className="text-right text-xs text-gray-500">
            {route.estimatedStartTime} - {route.estimatedEndTime}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="h-4 w-4 text-blue-500" />
            <span>{route.totalDistance} km</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-green-500" />
            <span>{Math.ceil(route.totalTime / 60)}h {route.totalTime % 60}min</span>
          </div>
        </div>

        {route.suggestedTechnician && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Users className="h-4 w-4" />
            <span>Sugerido: {route.suggestedTechnician.name}</span>
          </div>
        )}

        <div className="space-y-1 mb-4">
          {route.sequence.slice(0, 3).map((agendamento, index) => (
            <div key={agendamento.id} className="flex items-center gap-2 text-xs">
              <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">
                {index + 1}
              </span>
              <span className="truncate">{agendamento.nome}</span>
              {agendamento.urgente && (
                <AlertTriangle className="h-3 w-3 text-red-500" />
              )}
            </div>
          ))}
          {route.sequence.length > 3 && (
            <div className="text-xs text-gray-500 ml-6">
              +{route.sequence.length - 3} mais...
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(route, route.suggestedTechnician?.id)}
            className="flex-1"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Salvar
          </Button>
          <Button
            size="sm"
            onClick={() => onApply(route)}
            className="flex-1"
          >
            <Navigation className="h-3 w-3 mr-1" />
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedRoutingPanel;
