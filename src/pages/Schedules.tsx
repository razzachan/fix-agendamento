
import React, { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SchedulesFilters from '@/components/schedules/SchedulesFilters';
import AgendamentosTable from '@/components/schedules/AgendamentosTable';
import SchedulesMap from '@/components/schedules/SchedulesMap';
import UnifiedRoutingPanel from '@/components/schedules/UnifiedRoutingPanel';
import ConfirmationDialog from '@/components/schedules/ConfirmationDialog';
import RoutingDialog from '@/components/schedules/RoutingDialog';
import CreateServiceOrderDialog from '@/components/schedules/CreateServiceOrderDialog';
import useSchedulesLogic from '@/hooks/schedules/useSchedulesLogic';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { MapPin, List, Route } from 'lucide-react';

const Schedules: React.FC = () => {
  const { agendamentos, isLoading, updateAgendamento } = useAppData();
  const [viewMode, setViewMode] = useState<'table' | 'map' | 'routing'>('table');

  const {
    selectedDate,
    selectedTechnician,
    selectedStatus,
    selectedUrgency,
    searchQuery,
    filteredAgendamentos,
    confirmationDialog,
    routingDialog,
    createOrderDialog,
    handleDateChange,
    handleStatusChange,
    handleTechnicianChange,
    handleUrgencyChange,
    handleSearchChange,
    handleClearDateFilter,
    handleClearSearchFilter,
    openConfirmDialog,
    openRescheduleDialog,
    openCancelDialog,
    openRoutingDialog,
    openCreateOrderDialog,
    closeDialog,
    closeRoutingDialog,
    closeCreateOrderDialog,
    performRouting,
    performCreateServiceOrder,
    isToday,
    getUrgencyClass,
    getStatusButtonClass,
    getTechnicians
  } = useSchedulesLogic(agendamentos, updateAgendamento);

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
        <h1 className="text-3xl font-bold tracking-tight">Pré-Agendamentos</h1>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('map')}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Mapa
          </Button>
          <Button
            variant={viewMode === 'routing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('routing')}
          >
            <Route className="h-4 w-4 mr-2" />
            Roteirização
          </Button>
        </div>
      </div>

      <Card className="shadow-md border-0">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle>Solicitações de Serviço</CardTitle>
          <CardDescription>
            Gerencie as solicitações de serviço para confirmação e roteirização
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

          {viewMode === 'table' ? (
            <AgendamentosTable
              filteredAgendamentos={filteredAgendamentos}
              getStatusButtonClass={getStatusButtonClass}
              getUrgencyClass={getUrgencyClass}
              isToday={isToday}
              openConfirmDialog={openConfirmDialog}
              openRescheduleDialog={openRescheduleDialog}
              openCancelDialog={openCancelDialog}
              openRoutingDialog={openRoutingDialog}
              openCreateOrderDialog={openCreateOrderDialog}
            />
          ) : viewMode === 'map' ? (
            <div className="mt-6">
              <SchedulesMap
                agendamentos={filteredAgendamentos}
                onMarkerClick={(agendamento) => {
                  // Opcional: fazer algo quando um marcador é clicado
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
                  // Opcional: atualizar dados ou navegar
                }}
                onAgendamentosUpdated={() => {
                  // Opcional: recarregar agendamentos
                  window.location.reload();
                }}
              />
            </div>
          )}

          {/* Diálogo de confirmação */}
          <ConfirmationDialog
            isOpen={confirmationDialog.isOpen}
            onClose={closeDialog}
            onConfirm={confirmationDialog.onConfirm}
            title={confirmationDialog.title}
            description={confirmationDialog.description}
            actionText={confirmationDialog.actionText}
            agendamentoNome={confirmationDialog.agendamentoNome}
            agendamentoEndereco={confirmationDialog.agendamentoEndereco}
            actionType={confirmationDialog.actionType}
          />

          {/* Diálogo de roteirização */}
          <RoutingDialog
            isOpen={routingDialog.isOpen}
            onClose={closeRoutingDialog}
            onConfirm={performRouting}
            title={routingDialog.title}
            description={routingDialog.description}
            actionText={routingDialog.actionText}
            agendamentoId={routingDialog.agendamentoId}
            agendamentoNome={routingDialog.agendamentoNome}
            agendamentoEndereco={routingDialog.agendamentoEndereco}
          />

          {/* Diálogo de criação de ordem de serviço */}
          <CreateServiceOrderDialog
            isOpen={createOrderDialog.isOpen}
            onClose={closeCreateOrderDialog}
            onConfirm={performCreateServiceOrder}
            agendamento={createOrderDialog.agendamento}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Schedules;
