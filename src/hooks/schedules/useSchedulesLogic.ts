
import { useState, useEffect } from 'react';
import { AgendamentoAI } from '@/services/agendamentos';
import useSchedulesFilters from './useSchedulesFilters';
import useConfirmationDialog from './useConfirmationDialog';
import { isToday, getUrgencyClass, getStatusButtonClass } from './utils/statusUtils';

export const useSchedulesLogic = (agendamentos: AgendamentoAI[], updateAgendamento: (id: string, updates: Partial<AgendamentoAI>) => Promise<boolean>) => {
  const {
    selectedDate,
    selectedTechnician,
    selectedStatus,
    selectedUrgency,
    searchQuery,
    filteredAgendamentos: initialFilteredAgendamentos,
    handleDateChange,
    handleStatusChange,
    handleTechnicianChange,
    handleUrgencyChange,
    handleSearchChange,
    handleClearDateFilter,
    handleClearSearchFilter,
    getTechnicians
  } = useSchedulesFilters({ agendamentos });

  const [filteredAgendamentos, setFilteredAgendamentos] = useState<AgendamentoAI[]>([]);

  // Update filteredAgendamentos when initialFilteredAgendamentos changes
  useEffect(() => {
    setFilteredAgendamentos(initialFilteredAgendamentos);
  }, [initialFilteredAgendamentos]);

  const {
    confirmationDialog,
    routingDialog,
    createOrderDialog,
    openConfirmDialog,
    openRescheduleDialog,
    openCancelDialog,
    openRoutingDialog,
    openCreateOrderDialog,
    closeDialog,
    closeRoutingDialog,
    closeCreateOrderDialog,
    performRouting,
    performCreateServiceOrder
  } = useConfirmationDialog({
    updateAgendamento,
    filteredAgendamentos,
    setFilteredAgendamentos
  });

  return {
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
  };
};

export default useSchedulesLogic;
