
import React, { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SchedulesFilters from '@/components/schedules/SchedulesFilters';
import PreAgendamentosView from '@/components/schedules/PreAgendamentosView';
import PreAgendamentosStats from '@/components/schedules/PreAgendamentosStats';
import SchedulesMap from '@/components/schedules/SchedulesMap';
import UnifiedRoutingPanel from '@/components/schedules/UnifiedRoutingPanel';
import useSchedulesLogic from '@/hooks/schedules/useSchedulesLogic';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { MapPin, List, Route } from 'lucide-react';

const Schedules: React.FC = () => {
  const { agendamentos, isLoading, refreshAgendamentos } = useAppData();
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'routing'>('list');

  const {
    selectedDate,
    selectedTechnician,
    selectedStatus,
    selectedUrgency,
    searchQuery,
    filteredAgendamentos,
    handleDateChange,
    handleStatusChange,
    handleTechnicianChange,
    handleUrgencyChange,
    handleSearchChange,
    handleClearDateFilter,
    handleClearSearchFilter,
    getTechnicians
  } = useSchedulesLogic(agendamentos, () => {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Toaster richColors position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Pré-Agendamentos</h1>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie as solicitações de serviço recebidas
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="bg-[#e5b034] hover:bg-[#d4a02a] text-white border-[#e5b034]"
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
            className={viewMode === 'map' ? 'bg-[#e5b034] hover:bg-[#d4a02a] text-white border-[#e5b034]' : ''}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Mapa
          </Button>
          <Button
            variant={viewMode === 'routing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('routing')}
            className={viewMode === 'routing' ? 'bg-[#e5b034] hover:bg-[#d4a02a] text-white border-[#e5b034]' : ''}
          >
            <Route className="h-4 w-4 mr-2" />
            Roteirização
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="border-b bg-gradient-to-r from-[#e5b034]/10 to-[#e5b034]/5">
          <CardTitle className="text-xl text-gray-900">Solicitações de Serviço</CardTitle>
          <CardDescription className="text-gray-600">
            Visualize as solicitações recebidas. Use a roteirização para agendar efetivamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <SchedulesFilters
            selectedDate={selectedDate}
            selectedTechnician={selectedTechnician}
            selectedStatus={selectedStatus}
            selectedUrgency={selectedUrgency}
            searchQuery={searchQuery}
            handleDateChange={handleDateChange}
            handleTechnicianChange={handleTechnicianChange}
            handleStatusChange={handleStatusChange}
            handleUrgencyChange={handleUrgencyChange}
            handleSearchChange={handleSearchChange}
            handleClearDateFilter={handleClearDateFilter}
            handleClearSearchFilter={handleClearSearchFilter}
            technicians={getTechnicians()}
          />

          {viewMode === 'list' ? (
            <div className="mt-6">
              <PreAgendamentosStats agendamentos={filteredAgendamentos} />
              <PreAgendamentosView
                agendamentos={filteredAgendamentos}
                onAgendamentoDeleted={refreshAgendamentos}
              />
            </div>
          ) : viewMode === 'map' ? (
            <div className="mt-6">
              <SchedulesMap
                agendamentos={filteredAgendamentos}
                onMarkerClick={(agendamento) => {
                  console.log('Marcador clicado:', agendamento);
                }}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Clique nos marcadores para ver detalhes. Marcadores em vermelho indicam solicitações urgentes.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <UnifiedRoutingPanel
                agendamentos={agendamentos}
                selectedDate={selectedDate}
                onRouteCreated={(routeData) => {
                  console.log('Rota criada:', routeData);
                }}
                onAgendamentosUpdated={() => {
                  window.location.reload();
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Schedules;
