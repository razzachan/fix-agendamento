
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { clientService } from '@/services';
import DeleteAllClientsDialog from './DeleteAllClientsDialog';

interface ClientsActionsProps {
  onRefresh: () => void;
  onDeleteAllClick: () => void;
  onDeleteExampleClients: () => Promise<void>;
  isDeletingExamples: boolean;
}

const ClientsActions: React.FC<ClientsActionsProps> = ({
  onRefresh,
  onDeleteAllClick,
  onDeleteExampleClients,
  isDeletingExamples
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  
  const handleDeleteAllClients = async () => {
    try {
      setIsDeleting(true);
      setDeleteStatus('Excluindo clientes...');
      
      const result = await clientService.deleteAll();
      
      if (result) {
        toast.success("Todos os clientes foram excluídos com sucesso!");
        onRefresh(); // Refresh the list after deleting
        setIsDeleteDialogOpen(false);
      } else {
        toast.info("Alguns clientes não puderam ser excluídos porque possuem ordens de serviço vinculadas.");
      }
    } catch (error) {
      console.error("Error deleting clients:", error);
      toast.error("Erro ao excluir clientes");
    } finally {
      setIsDeleting(false);
      setDeleteStatus('');
    }
  };

  const handleMergeDuplicates = async () => {
    try {
      setIsMerging(true);
      toast.info("Procurando e mesclando clientes duplicados...");
      
      // Call the backend function to merge duplicates
      const result = await clientService.mergeDuplicateClients();
      console.log("Resultado da operação de mesclagem:", result);
      
      if (result && result.mergedCount > 0) {
        toast.success(`${result.mergedCount} clientes duplicados foram mesclados com sucesso!`);
        // Force a refresh to update the client list
        setTimeout(() => {
          onRefresh();
        }, 500);
      } else if (result && result.mergedCount === 0) {
        toast.info("Nenhum cliente duplicado foi encontrado pelo sistema.");
        // Force a refresh anyway to ensure the list is current
        onRefresh();
      } else {
        toast.error("Ocorreu um erro ao mesclar clientes duplicados.");
      }
    } catch (error) {
      console.error("Error merging clients:", error);
      toast.error("Erro ao mesclar clientes duplicados");
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-between mb-4">
      <div className="flex gap-2">
        {/* Button to delete example clients has been removed */}
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={handleMergeDuplicates}
          disabled={isMerging}
          className="text-orange-600 border-orange-200 hover:bg-orange-50"
        >
          {isMerging ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mesclando...
            </>
          ) : (
            'Mesclar Duplicados'
          )}
        </Button>
      </div>

      <DeleteAllClientsDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        onDeleteAll={handleDeleteAllClients}
        isDeleting={isDeleting}
        deleteStatus={deleteStatus}
      />
    </div>
  );
};

export default ClientsActions;
