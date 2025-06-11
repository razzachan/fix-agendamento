
import React from 'react';
import { Client } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ClientRow from './ClientRow';

interface ClientsTableProps {
  clients: Client[];
  onViewClientDetails: (clientId: string) => void;
  onDeleteClick: (client: Client) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onViewClientDetails,
  onDeleteClick
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <ClientRow 
              key={client.id}
              client={client}
              onViewClientDetails={onViewClientDetails}
              onDeleteClick={onDeleteClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientsTable;
