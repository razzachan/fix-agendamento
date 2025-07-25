
import React, { useState } from 'react';
import { Client } from '@/types';
import { formatAddressOneLine, extractAddressFromClient } from '@/utils/addressFormatter';
import { User, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from "@/components/ui/table";
import { ClientDetailsDialog } from './row';

interface ClientRowProps {
  client: Client;
  onViewClientDetails: (clientId: string) => void;
  onDeleteClick: (client: Client) => void;
}

const ClientRow: React.FC<ClientRowProps> = ({
  client,
  onViewClientDetails,
  onDeleteClick
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleViewDetails = () => {
    setShowDetails(true);
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span>{client.name}</span>
          </div>
        </TableCell>
        <TableCell>{client.email || '-'}</TableCell>
        <TableCell>{client.phone || '-'}</TableCell>
        <TableCell>
          {formatAddressOneLine(extractAddressFromClient(client)) || '-'}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewDetails}
              className="flex items-center gap-1 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Eye className="h-4 w-4" />
              Ver detalhes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteClick(client)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <ClientDetailsDialog
        client={client}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />
    </>
  );
};

export default ClientRow;
