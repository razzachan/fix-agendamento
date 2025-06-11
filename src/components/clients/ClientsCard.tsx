
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientsList from './ClientsList';
import { Client } from '@/types';

interface ClientsCardProps {
  clients: Client[];
  filteredClients: Client[];
  isLoading: boolean;
  refreshing: boolean;
  searchTerm: string;
  onRefresh: () => void;
}

const ClientsCard: React.FC<ClientsCardProps> = ({
  clients,
  filteredClients,
  isLoading,
  refreshing,
  searchTerm,
  onRefresh,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <ClientsList 
          clients={clients}
          filteredClients={filteredClients}
          isLoading={isLoading}
          refreshing={refreshing}
          searchTerm={searchTerm}
          onRefresh={onRefresh}
        />
      </CardContent>
    </Card>
  );
};

export default ClientsCard;
