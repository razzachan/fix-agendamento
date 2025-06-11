import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RouteResponse, RouteWaypoint } from '@/services/maps/mapboxService';
import { AgendamentoAI } from '@/services/agendamentos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Navigation, Save, Share2, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LogisticsGroup } from './RoutingDateSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Technician {
  id: string;
  name: string;
}

interface RouteDetailsProps {
  route: RouteResponse;
  waypoints: RouteWaypoint[];
  agendamentos: AgendamentoAI[];
  scheduledDate: Date;
  logisticsGroup: LogisticsGroup;
  onSaveRoute: () => void;
  onShareRoute?: () => void;
  technicians?: Technician[];
  onAssignToTechnician?: (technicianId: string, routeData: {
    route: RouteResponse;
    waypoints: RouteWaypoint[];
    scheduledDate: Date;
    logisticsGroup: LogisticsGroup;
  }) => void;
}

const RouteDetails: React.FC<RouteDetailsProps> = ({
  route,
  waypoints,
  agendamentos,
  scheduledDate,
  logisticsGroup,
  onSaveRoute,
  onShareRoute,
  technicians = [],
  onAssignToTechnician
}) => {
  // Estado para armazenar o técnico selecionado
  const [selectedTechnician, setSelectedTechnician] = useState<string>('');

  // Função para atribuir a rota ao técnico selecionado
  const handleAssignToTechnician = () => {
    if (!selectedTechnician) {
      toast.error('Selecione um técnico para atribuir a rota');
      return;
    }

    if (onAssignToTechnician) {
      onAssignToTechnician(selectedTechnician, {
        route,
        waypoints,
        scheduledDate,
        logisticsGroup
      });

      toast.success(`Rota atribuída ao técnico com sucesso!`);
    }
  };
  // Função para formatar duração em horas e minutos
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} minutos`;
  };

  // Função para formatar distância em km
  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  // Encontrar o agendamento correspondente a um waypoint
  const findAgendamento = (waypointName: string): AgendamentoAI | undefined => {
    return agendamentos.find(a => a.nome === waypointName);
  };

  // Calcular o tempo total estimado incluindo tempo de serviço
  const calculateTotalTime = (): string => {
    // Tempo de deslocamento
    const travelTime = route.routes[0].duration;

    // Calcular o tempo de serviço com base no tipo de atendimento
    let serviceTime = 0;

    waypoints.forEach(waypoint => {
      const agendamento = findAgendamento(waypoint.name);
      if (agendamento) {
        // Verificar o tipo de serviço
        if (agendamento.tipo_servico === 'coleta' ||
            (agendamento.problema && agendamento.problema.toLowerCase().includes('coleta'))) {
          // Coletas: 20-40 minutos (média de 30 minutos)
          serviceTime += 30 * 60;
        } else {
          // Serviços em domicílio: 40-60 minutos (média de 50 minutos)
          serviceTime += 50 * 60;
        }
      } else {
        // Se não conseguir determinar o tipo, usar média de 45 minutos
        serviceTime += 45 * 60;
      }
    });

    // Tempo total
    const totalTime = travelTime + serviceTime;

    return formatDuration(totalTime);
  };

  // Obter a descrição do grupo logístico
  const getGroupLabel = (group: LogisticsGroup): string => {
    switch (group) {
      case 'A': return 'Grupo A (Até 15 km - Florianópolis)';
      case 'B': return 'Grupo B (15-40 km - Grande Floripa)';
      case 'C': return 'Grupo C (40+ km - Litoral Norte)';
      default: return 'Sem grupo específico';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Detalhes da Rota Otimizada
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSaveRoute}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
            {onShareRoute && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShareRoute}
                className="flex items-center gap-1"
              >
                <Share2 className="h-4 w-4" />
                Compartilhar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Informações da rota */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200">
            <Calendar className="h-3 w-3 text-blue-600" />
            Data de Execução: {format(scheduledDate, "dd/MM/yyyy", { locale: ptBR })}
          </Badge>
          {logisticsGroup && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {getGroupLabel(logisticsGroup)}
            </Badge>
          )}
          <div className="w-full mt-2 text-xs text-blue-600">
            Esta rota está programada para ser executada na data acima. Os agendamentos serão confirmados para esta data.
          </div>
        </div>

        {/* Seleção de técnico */}
        {technicians.length > 0 && (
          <div className="mb-4 p-3 border rounded-md bg-blue-50">
            <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
              <User className="h-4 w-4" />
              Atribuir rota a um técnico
            </h3>
            <div className="flex gap-2">
              <Select
                value={selectedTechnician}
                onValueChange={setSelectedTechnician}
              >
                <SelectTrigger className="flex-1 bg-white">
                  <SelectValue placeholder="Selecione um técnico" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map(tech => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAssignToTechnician}
                disabled={!selectedTechnician}
                className="flex items-center gap-1"
              >
                <User className="h-4 w-4" />
                Atribuir
              </Button>
            </div>
          </div>
        )}

        {/* Resumo da rota */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-md">
            <div className="text-sm text-gray-500">Distância total</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <Navigation className="h-4 w-4 text-blue-600" />
              {formatDistance(route.routes[0].distance)}
            </div>
          </div>
          <div className="bg-indigo-50 p-3 rounded-md">
            <div className="text-sm text-gray-500">Tempo estimado (total)</div>
            <div className="text-lg font-semibold flex items-center gap-1">
              <Clock className="h-4 w-4 text-indigo-600" />
              {calculateTotalTime()}
            </div>
          </div>
        </div>

        {/* Lista de paradas */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Sequência de Atendimentos</h3>
          <div className="space-y-3">
            {route.waypoints.map((waypoint, index) => {
              const waypointData = waypoints.find(wp =>
                wp.coordinates.lng === waypoint.location[0] &&
                wp.coordinates.lat === waypoint.location[1]
              );

              if (!waypointData) return null;

              const agendamento = findAgendamento(waypointData.name);

              return (
                <div
                  key={index}
                  className="flex items-start p-3 border rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 bg-blue-100 text-blue-800 font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3">
                    {index + 1}
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium flex items-center gap-2">
                      {waypointData.name}
                      {agendamento && (
                        agendamento.tipo_servico === 'coleta' ||
                        (agendamento.problema && agendamento.problema.toLowerCase().includes('coleta'))
                          ? <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M8 5a1 1 0 011 1v1h1a1 1 0 110 2H9v1a1 1 0 11-2 0V9H6a1 1 0 110-2h1V6a1 1 0 011-1z" />
                                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 1h10a1 1 0 011 1v8a1 1 0 01-1 1H7a1 1 0 01-1-1V6a1 1 0 011-1z" clipRule="evenodd" />
                              </svg>
                              Coleta
                            </Badge>
                          : <Badge variant="default" className="text-xs flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                              </svg>
                              Domicílio
                            </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {agendamento?.endereco || 'Endereço não disponível'}
                    </div>
                    {agendamento && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {agendamento.equipamento}
                        </Badge>
                        {agendamento.urgente && (
                          <Badge variant="destructive" className="text-xs">
                            Urgente
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex flex-col items-end">
                    {index < route.waypoints.length - 1 && route.routes[0].legs[index] && (
                      <>
                        <div>{formatDistance(route.routes[0].legs[index].distance)}</div>
                        <div>Deslocamento: {formatDuration(route.routes[0].legs[index].duration)}</div>
                      </>
                    )}
                    <div className="mt-1 font-medium">
                      Atendimento: {
                        agendamento?.tipo_servico === 'coleta' ||
                        (agendamento?.problema && agendamento.problema.toLowerCase().includes('coleta'))
                          ? '20-40 min'
                          : '40-60 min'
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas e recomendações */}
        <div className="mt-6 bg-yellow-50 p-3 rounded-md text-sm">
          <h3 className="font-medium text-yellow-800">Notas</h3>
          <ul className="mt-1 text-yellow-700 list-disc list-inside">
            <li>Esta rota foi otimizada para minimizar o tempo total de deslocamento.</li>
            <li>O tempo estimado inclui aproximadamente 40-60 minutos para serviços em domicílio e 20-40 minutos para coletas.</li>
            <li>Considere condições de trânsito e possíveis atrasos.</li>
            <li>Verifique a disponibilidade dos clientes antes de confirmar.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteDetails;
