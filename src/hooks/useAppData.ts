
import { useState, useEffect } from 'react';
import { useClientsData } from './data/useClientsData';
import { useTechniciansData } from './data/useTechniciansData';
import { useServiceOrdersData } from './data/useServiceOrdersData';
import { useScheduledServicesData } from './data/useScheduledServicesData';
import { useFinancialTransactions } from './data/useFinancialTransactions';
import { useAgendamentosData } from './data/useAgendamentosData';

export function useAppData() {
  const [appDataVersion, setAppDataVersion] = useState(0);

  const { 
    clients, 
    addClient, 
    updateClient, 
    deleteClient, 
    isLoading: isClientsLoading, 
    refreshClients 
  } = useClientsData();
  
  const { 
    technicians, 
    addTechnician, 
    updateTechnician, 
    deleteTechnician, 
    isLoading: isTechniciansLoading, 
    refreshTechnicians 
  } = useTechniciansData();
  
  const { 
    serviceOrders, 
    addServiceOrder, 
    updateServiceOrder, 
    deleteServiceOrder, 
    isLoading: isServiceOrdersLoading, 
    refreshServiceOrders 
  } = useServiceOrdersData();
  
  const { 
    scheduledServices, 
    addScheduledService, 
    updateScheduledService, 
    deleteScheduledService, 
    isLoading: isScheduledServicesLoading, 
    technicianId,
    refreshScheduledServices 
  } = useScheduledServicesData();

  const {
    financialTransactions,
    addFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
    isLoading: isFinancialLoading,
    refreshFinancialTransactions
  } = useFinancialTransactions();
  
  const {
    agendamentos,
    updateAgendamento,
    isLoading: isAgendamentosLoading,
    refreshAgendamentos
  } = useAgendamentosData();

  // Function to trigger a manual refresh of all app data
  const refreshAppData = () => {
    Promise.all([
      refreshClients(),
      refreshTechnicians(),
      refreshServiceOrders(),
      refreshScheduledServices(),
      refreshFinancialTransactions(),
      refreshAgendamentos()
    ]).then(() => {
      setAppDataVersion(prevVersion => prevVersion + 1);
    });
  };

  return {
    appDataVersion,
    clients,
    addClient,
    updateClient,
    deleteClient,
    technicians,
    addTechnician,
    updateTechnician,
    deleteTechnician,
    serviceOrders,
    addServiceOrder,
    updateServiceOrder,
    deleteServiceOrder,
    refreshServiceOrders,
    scheduledServices,
    addScheduledService,
    updateScheduledService,
    deleteScheduledService,
    technicianId,
    isScheduledServicesLoading,
    refreshScheduledServices,
    financialTransactions,
    addFinancialTransaction,
    updateFinancialTransaction,
    deleteFinancialTransaction,
    refreshFinancialTransactions,
    agendamentos,
    updateAgendamento,
    refreshAgendamentos,
    refreshAppData,
    isLoading: isClientsLoading || isTechniciansLoading || isServiceOrdersLoading || isFinancialLoading || isScheduledServicesLoading || isAgendamentosLoading,
  };
}
