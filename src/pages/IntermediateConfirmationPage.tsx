import React, { useState, useEffect } from 'react';
import { AgendamentoAI } from '@/services/agendamentos';
import { agendamentosService } from '@/services/agendamentos';
import { mapboxService } from '@/services/maps/mapboxService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const IntermediateConfirmationPage: React.FC = () => {
  // Estados básicos
  const [agendamentos, setAgendamentos] = useState<AgendamentoAI[]>([]);
  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgendamento, setSelectedAgendamento] = useState<AgendamentoAI | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmationTime, setConfirmationTime] = useState('');
  const [confirmationDate, setConfirmationDate] = useState<Date | undefined>(new Date());

  // Carregar agendamentos e rotas salvas
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Carregar agendamentos
        const agendamentosData = await agendamentosService.getAll();
        setAgendamentos(agendamentosData);
        
        // Carregar rotas salvas
        const routesData = await mapboxService.getSavedRoutes({});
        setSavedRoutes(routesData);
        
        console.log(`Carregados ${agendamentosData.length} agendamentos e ${routesData.length} rotas salvas`);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar agendamentos por rota selecionada
  useEffect(() => {
    if (!selectedRoute) {
      // Se nenhuma rota estiver selecionada, mostrar agendamentos roteirizados
      const roteirizados = agendamentos.filter(a => a.status === 'roteirizado');
      setFilteredAgendamentos(roteirizados);
      return;
    }

    // Encontrar a rota selecionada
    const selectedRouteData = savedRoutes.find(route => route.id === selectedRoute);
    
    if (!selectedRouteData) {
      setFilteredAgendamentos([]);
      return;
    }
    
    console.log('Rota selecionada:', selectedRouteData);
    
    // Obter os IDs dos agendamentos na rota
    const routeWaypointIds = selectedRouteData.waypoints.map((wp: any) => wp.id);
    
    // Filtrar agendamentos que estão na rota
    const routeAgendamentos = agendamentos.filter(agendamento => 
      routeWaypointIds.includes(agendamento.id.toString())
    );
    
    setFilteredAgendamentos(routeAgendamentos);
  }, [agendamentos, selectedRoute, savedRoutes]);

  // Abrir diálogo de confirmação
  const handleOpenConfirmDialog = (agendamento: AgendamentoAI) => {
    console.log('Abrindo diálogo de confirmação para:', agendamento);
    setSelectedAgendamento(agendamento);
    
    // Obter data sugerida da rota selecionada
    if (selectedRoute) {
      const route = savedRoutes.find(r => r.id === selectedRoute);
      if (route && route.scheduled_date) {
        setConfirmationDate(new Date(route.scheduled_date));
      } else {
        setConfirmationDate(new Date());
      }
    } else {
      setConfirmationDate(new Date());
    }
    
    // Sugerir um horário com base na posição do agendamento na rota
    if (selectedRoute) {
      const selectedRouteData = savedRoutes.find(route => route.id === selectedRoute);
      if (selectedRouteData) {
        const waypointIndex = selectedRouteData.waypoints.findIndex((wp: any) => wp.id === agendamento.id.toString());
        if (waypointIndex >= 0) {
          // Calcular horário sugerido: 9h + 1h por ponto anterior na rota
          const baseHour = 9; // Começar às 9h
          const suggestedHour = baseHour + waypointIndex;
          
          // Garantir que o horário esteja dentro do horário comercial (9h-18h)
          const adjustedHour = Math.min(suggestedHour, 17); // Não passar das 17h
          
          // Formatar o horário sugerido (HH:MM)
          const suggestedTime = `${adjustedHour.toString().padStart(2, '0')}:00`;
          setConfirmationTime(suggestedTime);
          
          console.log(`Horário sugerido para ponto ${waypointIndex + 1}: ${suggestedTime}`);
        } else {
          setConfirmationTime('');
        }
      }
    } else {
      setConfirmationTime('');
    }
    
    setIsConfirmDialogOpen(true);
  };

  // Confirmar agendamento
  const handleConfirmAppointment = async () => {
    console.log('Tentando confirmar agendamento:', selectedAgendamento);
    console.log('Data selecionada:', confirmationDate);
    console.log('Horário selecionado:', confirmationTime);

    if (!selectedAgendamento || !confirmationDate || !confirmationTime) {
      console.error('Dados incompletos para confirmação');
      toast.error('Selecione data e horário para confirmar o agendamento');
      return;
    }

    try {
      setIsLoading(true);

      // Formatar data e hora para o formato ISO
      const dateTimeString = `${format(confirmationDate, 'yyyy-MM-dd')}T${confirmationTime}:00`;
      const confirmedDateTime = new Date(dateTimeString);

      // Atualizar o agendamento com o status "confirmado" e a data/hora confirmada
      const updatedAgendamento = {
        ...selectedAgendamento,
        status: 'confirmado',
        data_agendada: confirmedDateTime.toISOString()
      };

      await agendamentosService.update(selectedAgendamento.id, updatedAgendamento);

      // Atualizar a lista de agendamentos
      const updatedAgendamentos = agendamentos.map(a =>
        a.id === selectedAgendamento.id ? updatedAgendamento : a
      );

      setAgendamentos(updatedAgendamentos);
      setIsConfirmDialogOpen(false);
      toast.success('Agendamento confirmado com sucesso!');
    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast.error('Erro ao confirmar agendamento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Confirmação de Agendamentos</h1>
          <p className="text-muted-foreground">
            Confirme os agendamentos roteirizados com os clientes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Route className="h-5 w-5 text-blue-600" />
            Rotas Salvas
          </CardTitle>
          <CardDescription>
            Selecione uma rota para confirmar os agendamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="route">Rota</Label>
              <Select
                value={selectedRoute || ''}
                onValueChange={(value) => setSelectedRoute(value || null)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Selecione uma rota" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os agendamentos roteirizados</SelectItem>
                  {savedRoutes.map(route => (
                    <SelectItem key={route.id} value={route.id}>
                      {route.name} ({route.waypoints.length} pontos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRoute && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {(() => {
                      const route = savedRoutes.find(r => r.id === selectedRoute);
                      if (route) {
                        const date = new Date(route.scheduled_date);
                        return `Rota criada para ${format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
                      }
                      return '';
                    })()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos</CardTitle>
          <CardDescription>
            {isLoading ? 'Carregando...' : `${filteredAgendamentos.length} agendamentos encontrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <p>Carregando agendamentos...</p>
            ) : filteredAgendamentos.length === 0 ? (
              <p>Nenhum agendamento encontrado para a rota selecionada.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgendamentos.map(agendamento => (
                  <Card key={agendamento.id}>
                    <CardContent className="p-4">
                      <h3 className="font-medium">{agendamento.nome}</h3>
                      <p className="text-sm text-gray-500">{agendamento.endereco}</p>
                      <p className="text-sm mt-2">
                        Status: <span className="font-medium">{agendamento.status || 'Pendente'}</span>
                      </p>
                      <Button 
                        className="mt-2 w-full" 
                        variant="outline"
                        disabled={agendamento.status === 'confirmado'}
                        onClick={() => handleOpenConfirmDialog(agendamento)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Confirmar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de confirmação */}
      <Dialog
        open={isConfirmDialogOpen}
        onOpenChange={(open) => {
          console.log('Dialog onOpenChange:', open);
          setIsConfirmDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Agendamento</DialogTitle>
            <DialogDescription>
              Defina a data e horário para confirmar o agendamento com o cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client" className="text-right">
                Cliente
              </Label>
              <div className="col-span-3">
                <p className="font-medium">{selectedAgendamento?.nome}</p>
                <p className="text-sm text-gray-500">{selectedAgendamento?.endereco}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmDate" className="text-right">
                Data
              </Label>
              <div className="col-span-3">
                <Input
                  id="confirmDate"
                  type="date"
                  value={confirmationDate ? format(confirmationDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Corrigir o problema de fuso horário adicionando o horário (12:00)
                      const dateStr = `${e.target.value}T12:00:00`;
                      const newDate = new Date(dateStr);
                      setConfirmationDate(newDate);
                      console.log('Data de confirmação:', newDate);
                    } else {
                      setConfirmationDate(undefined);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmTime" className="text-right">
                Horário
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="confirmTime"
                  type="time"
                  value={confirmationTime}
                  onChange={(e) => setConfirmationTime(e.target.value)}
                  className="w-full"
                />
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <p className="text-xs text-gray-500 w-full">Horários sugeridos:</p>
                  {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(time => (
                    <Button
                      key={time}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmationTime(time)}
                      className={`text-xs px-2 py-1 h-auto ${confirmationTime === time ? 'bg-blue-100 border-blue-500' : ''}`}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmAppointment} disabled={isLoading}>
              {isLoading ? 'Processando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntermediateConfirmationPage;
