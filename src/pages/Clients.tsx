
import React from 'react';
import ClientsHeader from '@/components/clients/ClientsHeader';
import ClientSearch from '@/components/clients/ClientSearch';
import ClientsList from '@/components/clients/ClientsList';
import { useClientsData } from '@/hooks/useClientsData';

const Clients: React.FC = () => {
  const { 
    clients, 
    filteredClients, 
    isLoading, 
    refreshing, 
    searchTerm, 
    setSearchTerm, 
    fetchClients 
  } = useClientsData();

  // Handler for the refresh button click
  const handleRefreshClick = () => {
    fetchClients(true); // Force refresh with toast
  };

  return (
    <div className="space-y-6">
      <ClientsHeader />
      
      <ClientSearch 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={handleRefreshClick}
        refreshing={refreshing}
      />

      <ClientsList 
        clients={clients}
        filteredClients={filteredClients}
        isLoading={isLoading}
        refreshing={refreshing}
        searchTerm={searchTerm}
        onRefresh={handleRefreshClick}
      />
    </div>
  );
};

export default Clients;
