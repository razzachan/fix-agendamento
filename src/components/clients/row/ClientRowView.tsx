
import React from 'react';
import { Client } from '@/types';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface ClientRowViewProps {
  client: Client;
  onEditClick: () => void;
}

const ClientRowView: React.FC<ClientRowViewProps> = ({ client, onEditClick }) => {
  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-4 md:grid-cols-2">
        {client.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{client.phone}</span>
          </div>
        )}
      </div>

      {client.address && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <div>{client.address}</div>
            {(client.city && client.state) && (
              <div className="text-muted-foreground">
                {client.city}/{client.state} 
                {client.zipCode && ` - ${client.zipCode}`}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="pt-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onEditClick}
          className="flex items-center gap-1"
        >
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </div>
    </div>
  );
};

export default ClientRowView;
