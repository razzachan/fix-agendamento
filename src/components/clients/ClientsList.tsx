import React, { useState } from 'react';
import { Client } from '@/types';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { clientService } from '@/services';

// Componentes refatorados
import ClientsActions from './ClientsActions';
import ClientsTable from './ClientsTable';
import ClientsEmptyState from './ClientsEmptyState';
import DeleteClientDialog from './DeleteClientDialog';
import DeleteAllClientsDialog from './DeleteAllClientsDialog';

interface ClientsListProps {
  clients: Client[];
  filteredClients: Client[];
  isLoading: boolean;
  refreshing: boolean;
  searchTerm: string;
  onRefresh: () => void;
}

const ClientsList: React.FC<ClientsListProps> = ({
  clients,
  filteredClients,
  isLoading,
  refreshing,
  searchTerm,
  onRefresh,
}) => {
  const navigate = useNavigate();
  
  // Estados locais
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');

  // Handler para visualizar detalhes do cliente
  const handleViewClientDetails = (clientId: string) => {
    // Force refresh after any dialog interaction to ensure updated data
    console.log("Cliente visualizado, agendando atualização da lista...");
    setTimeout(() => {
      console.log("Executando atualização da lista após interação com diálogo");
      onRefresh();
    }, 800);
  };

  // Função para abrir o diálogo de confirmação de exclusão
  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  // Função para confirmar a exclusão do cliente
  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    
    try {
      setIsDeleting(true);
      
      const success = await clientService.delete(clientToDelete.id);
      
      if (success) {
        toast.success(`Cliente "${clientToDelete.name}" excluído com sucesso`);
        // Forçar uma atualização completa da lista após exclusão
        setTimeout(() => {
          onRefresh();
        }, 100);
      } else {
        toast.error("Não foi possível excluir o cliente. Possivelmente possui ordens de serviço vinculadas.");
      }
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  // Função para abrir o diálogo de exclusão de todos os clientes
  const handleDeleteAllClick = () => {
    setDeleteAllDialogOpen(true);
  };

  // Função para confirmar a exclusão de todos os clientes
  const handleDeleteAllConfirm = async () => {
    try {
      setIsDeletingAll(true);
      setDeleteStatus('Excluindo clientes...');
      
      const success = await clientService.deleteAll();
      
      if (success) {
        toast.success("Todos os clientes foram processados");
        // Forçar uma atualização completa da lista após exclusão
        setTimeout(() => {
          onRefresh();
        }, 500);
      }
    } catch (error) {
      console.error("Erro ao excluir todos os clientes:", error);
      toast.error("Erro ao excluir todos os clientes");
    } finally {
      setIsDeletingAll(false);
      setDeleteStatus('');
      setDeleteAllDialogOpen(false);
    }
  };

  // Mostrar loading quando estiver carregando inicialmente
  if (isLoading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostrar estado vazio quando não houver clientes
  if (filteredClients.length === 0) {
    return (
      <ClientsEmptyState 
        searchTerm={searchTerm} 
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
    );
  }

  return (
    <div>
      <ClientsActions 
        onRefresh={onRefresh}
        onDeleteAllClick={handleDeleteAllClick}
        onDeleteExampleClients={() => Promise.resolve()}
        isDeletingExamples={false}
      />
      
      <ClientsTable
        clients={filteredClients}
        onViewClientDetails={handleViewClientDetails}
        onDeleteClick={handleDeleteClick}
      />

      <DeleteClientDialog
        isOpen={deleteDialogOpen}
        setIsOpen={setDeleteDialogOpen}
        client={clientToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
      
      <DeleteAllClientsDialog
        isOpen={deleteAllDialogOpen}
        setIsOpen={setDeleteAllDialogOpen}
        onDeleteAll={handleDeleteAllConfirm}
        isDeleting={isDeletingAll}
        deleteStatus={deleteStatus}
      />
    </div>
  );
};

export default ClientsList;
