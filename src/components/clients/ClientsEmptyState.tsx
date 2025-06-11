
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface ClientsEmptyStateProps {
  searchTerm: string;
  onRefresh: () => void;
  refreshing: boolean;
}

const ClientsEmptyState: React.FC<ClientsEmptyStateProps> = ({
  searchTerm,
  onRefresh,
  refreshing
}) => {
  return (
    <div className="text-center py-8 text-muted-foreground">
      {searchTerm 
        ? 'Nenhum cliente encontrado para esta busca.' 
        : (
          <div className="space-y-4">
            <p>Nenhum cliente cadastrado ou a lista não foi atualizada.</p>
            <Button 
              onClick={onRefresh}
              variant="outline" 
              className="flex items-center gap-2"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar Lista
            </Button>
          </div>
        )}
    </div>
  );
};

export default ClientsEmptyState;
