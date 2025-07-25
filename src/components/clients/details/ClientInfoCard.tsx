
import React from 'react';
import { Client } from '@/types';
import { AddressDisplay } from '@/components/ui/AddressDisplay';
import { extractAddressFromClient } from '@/utils/addressFormatter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, MapPin, User } from 'lucide-react';

interface ClientInfoCardProps {
  client: Client;
}

const ClientInfoCard: React.FC<ClientInfoCardProps> = ({ client }) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          {client.name}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
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

        <AddressDisplay
          data={extractAddressFromClient(client)}
          variant="default"
        />
      </CardContent>
    </Card>
  );
};

export default ClientInfoCard;
